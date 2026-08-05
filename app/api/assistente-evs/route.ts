import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  EVS_ASSISTANT_INSTRUCTIONS,
  EVS_SUPPORT_WHATSAPP
} from '@/lib/assistente-evs/prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUESTION_LENGTH = 2000;
const MAX_KNOWLEDGE_LENGTH = 60000;
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

type AssistantResult = {
  answer: string;
  needs_human_support: boolean;
};

type OpenAIErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

async function requestOpenAI(apiKey: string, requestBody: Record<string, unknown>) {
  const configuredModel = process.env.OPENAI_MODEL?.trim();
  const models = Array.from(
    new Set([configuredModel, DEFAULT_OPENAI_MODEL].filter(Boolean) as string[])
  );

  let lastResponse: Response | null = null;

  for (const model of models) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...requestBody, model })
    });

    if (response.ok) return response;

    lastResponse = response;
    const errorPayload = (await response
      .clone()
      .json()
      .catch(() => ({}))) as OpenAIErrorPayload;

    console.error('OpenAI Assistente EVS:', {
      status: response.status,
      model,
      requestId: response.headers.get('x-request-id'),
      code: errorPayload.error?.code,
      type: errorPayload.error?.type,
      message: errorPayload.error?.message
    });

    const canTryFallback =
      model !== DEFAULT_OPENAI_MODEL &&
      [400, 403, 404].includes(response.status);

    if (!canTryFallback) break;
  }

  return lastResponse;
}

function cleanSupportMarker(answer: string) {
  return answer.replace(/^\s*\[PRECISA_SUPORTE\]\s*/i, '').trim();
}

type KnowledgeItem = {
  lesson_number: number;
  title: string;
  content: string;
  sort_order?: number;
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildRelevantKnowledge(items: KnowledgeItem[], question: string) {
  const terms = Array.from(
    new Set(
      normalizeSearchText(question)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3)
    )
  );

  const ranked = items
    .map((item, index) => {
      const title = normalizeSearchText(item.title);
      const body = normalizeSearchText(item.content);
      const score = terms.reduce((total, term) => {
        const titleMatches = title.split(term).length - 1;
        const bodyMatches = body.split(term).length - 1;
        return total + titleMatches * 8 + Math.min(bodyMatches, 12);
      }, 0);

      return { item, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: KnowledgeItem[] = [];
  let usedLength = 0;

  for (const entry of ranked) {
    const blockLength = entry.item.title.length + entry.item.content.length + 40;
    if (usedLength + blockLength > MAX_KNOWLEDGE_LENGTH) continue;
    selected.push(entry.item);
    usedLength += blockLength;
  }

  return selected
    .sort(
      (a, b) =>
        a.lesson_number - b.lesson_number ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )
    .map(
      (item) =>
        `AULA ${item.lesson_number} — ${item.title}\n${item.content}`
    )
    .join('\n\n');
}

function parseAssistantResult(payload: unknown): AssistantResult {
  const fallback: AssistantResult = {
    answer:
      'Não consegui encontrar essa orientação com segurança no conteúdo do EVS. Você pode falar com o suporte no WhatsApp ou registrar sua dúvida para a equipe responder.',
    needs_human_support: true
  };

  if (!payload || typeof payload !== 'object') return fallback;

  const outputText = (payload as { output_text?: unknown }).output_text;
  if (typeof outputText !== 'string' || !outputText.trim()) return fallback;

  try {
    const parsed = JSON.parse(outputText) as Partial<AssistantResult>;
    if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) return fallback;

    const markedForSupport = /^\s*\[PRECISA_SUPORTE\]/i.test(parsed.answer);
    return {
      answer: cleanSupportMarker(parsed.answer),
      needs_human_support:
        markedForSupport || parsed.needs_human_support === true
    };
  } catch {
    const markedForSupport = /^\s*\[PRECISA_SUPORTE\]/i.test(outputText);
    return {
      answer: cleanSupportMarker(outputText),
      needs_human_support: markedForSupport
    };
  }
}

async function requireAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { error: 'Supabase não configurado.', status: 500 } as const;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Faça login para usar a Assistente EVS.', status: 401 } as const;
  }

  return { supabase, user } as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId');

  let conversationsQuery = auth.supabase
    .from('evs_assistant_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false });

  const { data: conversations, error: conversationsError } =
    await conversationsQuery;

  if (conversationsError) {
    return NextResponse.json(
      { error: 'Não foi possível carregar as conversas.' },
      { status: 500 }
    );
  }

  if (!conversationId) {
    return NextResponse.json({ conversations: conversations ?? [] });
  }

  const ownsConversation = conversations?.some(
    (conversation) => conversation.id === conversationId
  );

  if (!ownsConversation) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await auth.supabase
    .from('evs_assistant_messages')
    .select('id, role, content, needs_human_support, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: 'Não foi possível carregar o histórico.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conversations: conversations ?? [],
    messages: messages ?? []
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Assistente EVS ainda não foi ativada.' },
      { status: 503 }
    );
  }

  let body: { question?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const question =
    typeof body.question === 'string' ? body.question.trim() : '';

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: 'Envie uma pergunta com até 2.000 caracteres.' },
      { status: 400 }
    );
  }

  let conversationId =
    typeof body.conversationId === 'string' ? body.conversationId : '';

  if (conversationId) {
    const { data: conversation } = await auth.supabase
      .from('evs_assistant_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    }
  } else {
    const title = question.slice(0, 70);
    const { data: conversation, error } = await auth.supabase
      .from('evs_assistant_conversations')
      .insert({ user_id: auth.user.id, title })
      .select('id')
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Não foi possível iniciar a conversa.' },
        { status: 500 }
      );
    }

    conversationId = conversation.id;
  }

  const { error: userMessageError } = await auth.supabase
    .from('evs_assistant_messages')
    .insert({
      conversation_id: conversationId,
      user_id: auth.user.id,
      role: 'user',
      content: question
    });

  if (userMessageError) {
    return NextResponse.json(
      { error: 'Não foi possível registrar sua pergunta.' },
      { status: 500 }
    );
  }

  const { data: knowledge, error: knowledgeError } = await auth.supabase
    .from('evs_assistant_knowledge')
    .select('lesson_number, title, content, sort_order')
    .order('lesson_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (knowledgeError) {
    return NextResponse.json(
      { error: 'Não foi possível acessar o conteúdo do EVS.' },
      { status: 500 }
    );
  }

  const knowledgeText = buildRelevantKnowledge(
    (knowledge ?? []) as KnowledgeItem[],
    question
  );

  if (!knowledgeText) {
    return NextResponse.json(
      { error: 'A base de conhecimento do EVS ainda não foi carregada.' },
      { status: 503 }
    );
  }

  let assistantResult: AssistantResult;

  try {
    const openAIResponse = await requestOpenAI(apiKey, {
      store: false,
      max_output_tokens: 900,
      instructions: EVS_ASSISTANT_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content:
            `BASE DE CONHECIMENTO EVS:\n${knowledgeText}\n\n` +
            `PERGUNTA ATUAL DA ALUNA:\n${question}`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'evs_support_answer',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              answer: { type: 'string' },
              needs_human_support: { type: 'boolean' }
            },
            required: ['answer', 'needs_human_support']
          }
        }
      }
    });

    if (!openAIResponse?.ok) {
      const providerStatus = openAIResponse?.status ?? 0;
      const diagnosticCode = providerStatus
        ? `EVS-${providerStatus}`
        : 'EVS-CONEXAO';

      return NextResponse.json(
        {
          error:
            `A assistente está temporariamente indisponível. Código ${diagnosticCode}.`
        },
        { status: 502 }
      );
    }

    assistantResult = parseAssistantResult(await openAIResponse.json());
  } catch (error) {
    console.error('Falha ao consultar a Assistente EVS:', error);
    return NextResponse.json(
      { error: 'A assistente está temporariamente indisponível.' },
      { status: 502 }
    );
  }

  const { error: assistantMessageError } = await auth.supabase
    .from('evs_assistant_messages')
    .insert({
      conversation_id: conversationId,
      user_id: auth.user.id,
      role: 'assistant',
      content: assistantResult.answer,
      needs_human_support: assistantResult.needs_human_support
    });

  if (assistantMessageError) {
    return NextResponse.json(
      { error: 'A resposta foi gerada, mas não pôde ser salva.' },
      { status: 500 }
    );
  }

  await auth.supabase
    .from('evs_assistant_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', auth.user.id);

  if (assistantResult.needs_human_support) {
    await auth.supabase.from('evs_assistant_unanswered_questions').insert({
      conversation_id: conversationId,
      user_id: auth.user.id,
      question
    });
  }

  return NextResponse.json({
    conversationId,
    answer: assistantResult.answer,
    needsHumanSupport: assistantResult.needs_human_support,
    support: assistantResult.needs_human_support
      ? {
          whatsappUrl: EVS_SUPPORT_WHATSAPP,
          canRegisterQuestion: true
        }
      : null
  });
}

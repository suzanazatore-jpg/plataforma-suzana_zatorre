import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const LOGIN_URL = (process.env.ACADEMY_URL || 'https://membros.suzanazatorre.com.br').replace(/\/$/, '');
const SENDER = { name: 'Suzana Zatorre', email: 'suporte@suzanazatorre.com.br' };

// ----------------------------------------------------------------------------
// Helpers de leitura da planilha
// ----------------------------------------------------------------------------

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeader(value: string) {
  return stripAccents(String(value || '')).toLowerCase().trim();
}

// Mapeia o nome da coluna da planilha para uma chave interna conhecida.
function mapHeader(header: string): string | null {
  const h = normalizeHeader(header);
  if (h.includes('nome')) return 'nome';
  if (h.includes('email') || h.includes('e-mail')) return 'email';
  if (h.includes('telefone') || h.includes('whatsapp') || h.includes('celular') || h.includes('fone')) return 'telefone';
  if (h.includes('compra')) return 'compra';
  if (h.includes('expira') || h.includes('vencimento') || h.includes('validade')) return 'expiracao';
  return null;
}

// Detecta o separador (vírgula ou ponto e vírgula) pela primeira linha.
function detectDelimiter(text: string): string {
  const firstLine = String(text || '').split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

// Parser de CSV que respeita aspas e campos com o separador dentro.
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => (cell || '').trim() !== ''));
}

// "15/01/2027 - 08:57" (fuso -03:00) -> ISO em UTC. Sem hora, usa 23:59.
function parseBrDate(input: string): string | null {
  const cleaned = String(input || '').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*[-–—]?\s*(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const hour = m[4] != null ? Number(m[4]) : 23;
  const minute = m[5] != null ? Number(m[5]) : 59;
  if (hour > 23 || minute > 59) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function brLabel(isoUtc: string | null): string | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return null;
  // Mostra a data no fuso de Brasília.
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sixDigitPassword(): string {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(100000 + (randomValue % 900000));
}

type ValidatedRow = {
  rowNumber: number;
  nome: string | null;
  email: string;
  telefone: string | null;
  purchasedAt: string | null;
  expiresAt: string | null;
  expiresLabel: string | null;
  error: string | null;
};

// Transforma as linhas cruas do CSV em linhas validadas.
function buildRows(text: string): { rows: ValidatedRow[]; fatal: string | null } {
  const delimiter = detectDelimiter(text);
  const grid = parseCsv(text, delimiter);
  if (grid.length < 2) {
    return { rows: [], fatal: 'A planilha precisa de um cabeçalho e ao menos uma linha.' };
  }

  const header = grid[0].map(mapHeader);
  if (!header.includes('email')) {
    return { rows: [], fatal: 'Não encontrei a coluna de e-mail no cabeçalho.' };
  }
  if (!header.includes('expiracao')) {
    return { rows: [], fatal: 'Não encontrei a coluna de data de expiração no cabeçalho.' };
  }

  const rows: ValidatedRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      if (key) record[key] = (cells[idx] || '').trim();
    });

    const email = (record.email || '').toLowerCase();
    const expiresAt = parseBrDate(record.expiracao || '');
    const purchasedAt = record.compra ? parseBrDate(record.compra) : null;

    let error: string | null = null;
    if (!email) error = 'E-mail em branco.';
    else if (!isValidEmail(email)) error = 'E-mail inválido.';
    else if (!record.expiracao) error = 'Data de expiração em branco.';
    else if (!expiresAt) error = 'Data de expiração inválida.';

    rows.push({
      rowNumber: i + 1,
      nome: record.nome || null,
      email,
      telefone: record.telefone || null,
      purchasedAt,
      expiresAt,
      expiresLabel: brLabel(expiresAt),
      error
    });
  }

  return { rows, fatal: null };
}

// ----------------------------------------------------------------------------
// E-mail de acesso (Brevo)
// ----------------------------------------------------------------------------

function buildEmailHtml(params: { name: string | null; email: string; tempPassword: string; courseName: string }) {
  const firstName = params.name?.trim().split(/\s+/)[0] || 'Aluna';
  const loginLink = `${LOGIN_URL}/login`;
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#111114;border-radius:14px;padding:28px 24px;text-align:center;">
      <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:.5px;">ACADEMIA DE VENDAS</div>
      <div style="color:#ff2e63;font-size:13px;margin-top:4px;">Suzana Zatorre</div>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;margin-top:12px;">
      <p style="font-size:16px;margin:0 0 14px;">Olá, ${firstName}! 🎉</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">Seu acesso ao curso <strong>${params.courseName}</strong> está liberado. Use os dados abaixo para entrar:</p>
      <div style="background:#f4f4f5;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:14px;margin:0 0 8px;"><strong>Login:</strong> ${params.email}</p>
        <p style="font-size:14px;margin:0;"><strong>Senha provisória:</strong> <span style="font-size:20px;letter-spacing:2px;color:#ff2e63;font-weight:bold;">${params.tempPassword}</span></p>
      </div>
      <div style="text-align:center;margin:0 0 20px;">
        <a href="${loginLink}" style="background:#ff2e63;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:10px;display:inline-block;">Acessar a plataforma</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0;">No primeiro acesso, recomendamos trocar a senha provisória por uma de sua preferência. Qualquer dúvida, é só responder este e-mail.</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin:16px 0 0;">Academia de Vendas · Suzana Zatorre</p>
  </div>
</body></html>`;
}

async function sendAccessEmail(params: { email: string; name: string | null; tempPassword: string; courseName: string }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY ausente no projeto.' };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: params.email, name: params.name || undefined }],
        subject: 'Seu acesso à Academia de Vendas',
        htmlContent: buildEmailHtml(params)
      })
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 180)}` };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha no envio do e-mail.' };
  }
}

// ----------------------------------------------------------------------------
// Segurança: só admin ativa
// ----------------------------------------------------------------------------

async function requireAdmin() {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false as const, status: 500, error: 'Credenciais do Supabase ausentes.' };

  const session = createSupabaseServerClient();
  if (!session) return { ok: false as const, status: 401, error: 'Sessão inválida.' };

  const { data: auth } = await session.auth.getUser();
  if (!auth?.user) return { ok: false as const, status: 401, error: 'Faça login novamente.' };

  const { data: perfil } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!perfil || perfil.role !== 'admin' || perfil.status !== 'active') {
    return { ok: false as const, status: 403, error: 'Acesso negado.' };
  }

  return { ok: true as const, admin };
}

// ----------------------------------------------------------------------------
// Importa uma linha: cria/acha a usuária, matricula e (se novo) envia e-mail
// ----------------------------------------------------------------------------

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

async function importOne(
  admin: AdminClient,
  course: { id: string; title: string },
  row: ValidatedRow,
  sendEmail: boolean
) {
  const email = row.email;
  const tempPassword = sixDigitPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: row.nome, phone: row.telefone, source: 'import' }
  });

  let userId = created?.user?.id || null;
  let isNew = Boolean(created?.user);

  if (createError) {
    if (createError.message.toLowerCase().includes('already')) {
      const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
      userId = prof?.id || null;
      isNew = false;
      if (!userId) {
        return { email, status: 'error' as const, emailed: false, error: 'Já existe, mas não localizei o perfil.' };
      }
    } else {
      return { email, status: 'error' as const, emailed: false, error: createError.message };
    }
  }

  if (!userId) {
    return { email, status: 'error' as const, emailed: false, error: 'Não consegui identificar a usuária.' };
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email,
    name: row.nome,
    phone: row.telefone,
    role: 'student',
    status: 'active'
  });
  if (profileError) {
    return { email, status: 'error' as const, emailed: false, error: profileError.message };
  }

  const enrollmentRow: Record<string, unknown> = {
    profile_id: userId,
    course_id: course.id,
    status: 'active',
    source: 'import',
    expires_at: row.expiresAt
  };
  if (row.purchasedAt) enrollmentRow.purchased_at = row.purchasedAt;

  const { error: enrollmentError } = await admin
    .from('enrollments')
    .upsert(enrollmentRow, { onConflict: 'profile_id,course_id' });
  if (enrollmentError) {
    return { email, status: 'error' as const, emailed: false, error: enrollmentError.message };
  }

  // E-mail só para usuária nova (a existente mantém a senha atual).
  let emailed = false;
  if (sendEmail && isNew) {
    const sent = await sendAccessEmail({ email, name: row.nome, tempPassword, courseName: course.title });
    emailed = sent.ok;
    if (!sent.ok) {
      return { email, status: 'created' as const, emailed: false, error: `Conta criada, mas e-mail falhou: ${sent.error}` };
    }
  }

  return { email, status: isNew ? ('created' as const) : ('exists' as const), emailed, error: null };
}

// ----------------------------------------------------------------------------
// Rota
// ----------------------------------------------------------------------------

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const admin = gate.admin;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 });
  }

  const mode = body.mode === 'commit' ? 'commit' : 'preview';
  const courseId = typeof body.courseId === 'string' ? body.courseId : '';
  const csv = typeof body.csv === 'string' ? body.csv : '';
  const sendEmail = body.sendEmail !== false;
  const offset = Number.isFinite(body.offset) ? Number(body.offset) : 0;
  const limit = Number.isFinite(body.limit) ? Math.min(Number(body.limit), 15) : 8;

  if (!courseId) return NextResponse.json({ ok: false, error: 'Selecione um curso.' }, { status: 400 });

  const { data: course } = await admin
    .from('courses')
    .select('id, title')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ ok: false, error: 'Curso não encontrado.' }, { status: 400 });

  const { rows, fatal } = buildRows(csv);
  if (fatal) return NextResponse.json({ ok: false, error: fatal }, { status: 400 });
  if (!rows.length) return NextResponse.json({ ok: false, error: 'Nenhuma linha para importar.' }, { status: 400 });

  if (mode === 'preview') {
    const emails = rows.filter((r) => !r.error).map((r) => r.email);
    const existing = new Set<string>();
    if (emails.length) {
      const { data: found } = await admin.from('profiles').select('email').in('email', emails);
      (found || []).forEach((r: any) => existing.add(String(r.email || '').toLowerCase()));
    }

    const preview = rows.map((r) => ({
      rowNumber: r.rowNumber,
      nome: r.nome,
      email: r.email,
      telefone: r.telefone,
      expiresLabel: r.expiresLabel,
      status: r.error ? 'error' : existing.has(r.email) ? 'exists' : 'new',
      error: r.error
    }));

    const summary = {
      total: preview.length,
      novas: preview.filter((p) => p.status === 'new').length,
      existem: preview.filter((p) => p.status === 'exists').length,
      erros: preview.filter((p) => p.status === 'error').length
    };

    return NextResponse.json({
      ok: true,
      mode: 'preview',
      course: { id: course.id, title: course.title },
      summary,
      rows: preview
    });
  }

  // commit — processa uma fatia (para não estourar o tempo do servidor)
  const slice = rows.slice(offset, offset + limit);
  const results = [];
  for (const row of slice) {
    if (row.error) {
      results.push({ email: row.email, status: 'error' as const, emailed: false, error: row.error });
      continue;
    }
    results.push(await importOne(admin, { id: course.id, title: course.title }, row, sendEmail));
  }

  const processed = Math.min(offset + limit, rows.length);
  return NextResponse.json({
    ok: true,
    mode: 'commit',
    total: rows.length,
    processed,
    done: processed >= rows.length,
    results
  });
}

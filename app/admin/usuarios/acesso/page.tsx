import Link from 'next/link';
import { User } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendAccessEmail } from '@/lib/email/access-email';
import AccessManager, { type CursoAcesso } from './access-manager';
import './acesso.css';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { id?: string };
};

type Resultado = { ok: boolean; mensagem: string };
type ResultadoSenha = Resultado & { senha?: string; whatsappUrl?: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function academyUrl() {
  return (process.env.ACADEMY_URL || 'https://academia.suzanazatorre.com.br').replace(/\/$/, '');
}

function plataformaUrl() {
  return (process.env.PLATFORM_URL || 'https://membros.suzanazatorre.com.br').replace(/\/$/, '');
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || 'Aluna';
}

function gerarSenhaProvisoria() {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(100000 + (randomValue % 900000));
}

// Deixa o telefone no formato que o WhatsApp entende (só dígitos, com DDI 55).
function normalizarWhatsapp(phone?: string | null): string | null {
  const digitos = String(phone || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.startsWith('55')) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

// Monta o link wa.me já com a mensagem de acesso pronta. Retorna null se não houver telefone.
function montarWhatsappUrl(phone: string | null | undefined, opcoes: { nome: string | null; email: string; senha: string }): string | null {
  const numero = normalizarWhatsapp(phone);
  if (!numero) return null;
  const mensagem =
    `Oi, ${primeiroNome(opcoes.nome || '')}! Aqui é da Academia de Vendas Suzana Zatorre 💕\n\n` +
    `Seu acesso à plataforma está pronto:\n` +
    `🔗 ${plataformaUrl()}\n` +
    `📧 E-mail: ${opcoes.email}\n` +
    `🔑 Senha: ${opcoes.senha}\n\n` +
    `É só entrar com esse e-mail e senha. Depois, se quiser, você troca a senha lá dentro. Qualquer dúvida, é só me chamar por aqui!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Converte o atalho de tempo (30d/3m/6m/12m) ou uma data exata (YYYY-MM-DD)
// numa data de vencimento ISO. Retorna null quando o prazo é inválido.
function calcularExpiracao(tempo?: string, dataFim?: string): string | null {
  const alvo = new Date();
  switch ((tempo || '').trim()) {
    case '30d': alvo.setDate(alvo.getDate() + 30); return alvo.toISOString();
    case '3m': alvo.setMonth(alvo.getMonth() + 3); return alvo.toISOString();
    case '6m': alvo.setMonth(alvo.getMonth() + 6); return alvo.toISOString();
    case '12m': alvo.setFullYear(alvo.getFullYear() + 1); return alvo.toISOString();
    case 'custom': {
      const data = String(dataFim || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
      const fim = new Date(`${data}T23:59:59`);
      return Number.isNaN(fim.getTime()) ? null : fim.toISOString();
    }
    default: return null;
  }
}

async function garantirAdmin() {
  const clienteSessao = createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  if (!clienteSessao || !supabase) return null;
  const { data } = await clienteSessao.auth.getUser();
  const adminId = data.user?.id;
  if (!adminId) return null;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', adminId)
    .maybeSingle();
  if (perfil?.role !== 'admin' || perfil.status !== 'active') return null;
  return { supabase, adminId };
}

async function salvarAcessos(alunaId: string, cursosAtivos: string[]): Promise<Resultado> {
  'use server';

  if (!UUID.test(alunaId) || cursosAtivos.some((id) => !UUID.test(id))) {
    return { ok: false, mensagem: 'Dados de acesso inválidos.' };
  }

  const admin = await garantirAdmin();
  if (!admin) return { ok: false, mensagem: 'Somente uma administradora conectada pode alterar acessos.' };
  const { supabase } = admin;

  const [{ data: aluna }, { data: cursos }, { data: matriculas, error }] =
    await Promise.all([
      supabase.from('profiles').select('id').eq('id', alunaId).maybeSingle(),
      supabase.from('courses').select('id'),
      supabase.from('enrollments').select('id, course_id, status').eq('profile_id', alunaId)
    ]);

  if (!aluna || error) {
    return { ok: false, mensagem: 'Não foi possível localizar a aluna.' };
  }

  const idsCursos = new Set((cursos || []).map((curso) => curso.id));
  if (cursosAtivos.some((id) => !idsCursos.has(id))) {
    return { ok: false, mensagem: 'Um dos cursos selecionados não existe mais.' };
  }

  const ativos = new Set(cursosAtivos);
  const existentes = new Map((matriculas || []).map((matricula) => [matricula.course_id, matricula]));

  const operacoes: PromiseLike<unknown>[] = [];

  for (const matricula of matriculas || []) {
    const novoStatus = ativos.has(matricula.course_id) ? 'active' : 'blocked';
    if (matricula.status !== novoStatus) {
      operacoes.push(
        supabase
          .from('enrollments')
          .update({ status: novoStatus, updated_at: new Date().toISOString() })
          .eq('id', matricula.id)
      );
    }
  }

  const novas = cursosAtivos
    .filter((courseId) => !existentes.has(courseId))
    .map((courseId) => ({
      profile_id: alunaId,
      course_id: courseId,
      status: 'active',
      source: 'admin',
      purchased_at: new Date().toISOString()
    }));

  if (novas.length > 0) {
    operacoes.push(supabase.from('enrollments').insert(novas));
  }

  const resultados = await Promise.all(operacoes);
  const falha = resultados.find(
    (resultado) =>
      typeof resultado === 'object' &&
      resultado !== null &&
      'error' in resultado &&
      Boolean((resultado as { error?: unknown }).error)
  );

  if (falha) {
    console.error('Erro ao salvar acessos:', falha);
    return { ok: false, mensagem: 'O Supabase não conseguiu salvar todos os acessos.' };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/acesso?id=${alunaId}`);
  revalidatePath('/area');
  return { ok: true, mensagem: 'Acessos salvos com sucesso.' };
}

async function salvarDadosAluna(dados: { id: string; nome: string; email: string; telefone: string }): Promise<Resultado> {
  'use server';
  const admin = await garantirAdmin();
  if (!admin) return { ok: false, mensagem: 'Somente uma administradora conectada pode editar os dados.' };
  const { supabase } = admin;

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const telefone = String(dados.telefone || '').replace(/\D/g, '');
  if (!UUID.test(dados.id) || !nome || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, mensagem: 'Confira o nome e o e-mail informados.' };
  }

  const { error: authErro } = await supabase.auth.admin.updateUserById(dados.id, {
    email,
    user_metadata: { name: nome, phone: telefone || null }
  });
  if (authErro) return { ok: false, mensagem: 'Não foi possível atualizar o login desta aluna.' };

  const { error: perfilErro } = await supabase
    .from('profiles')
    .update({ name: nome, email, phone: telefone || null, updated_at: new Date().toISOString() })
    .eq('id', dados.id);
  if (perfilErro) return { ok: false, mensagem: 'O login foi atualizado, mas os dados da lista não. Tente novamente.' };

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/acesso?id=${dados.id}`);
  return { ok: true, mensagem: 'Dados atualizados com sucesso.' };
}

// Define uma senha nova (gerada ou escolhida pela admin) e devolve a senha em texto
// junto com um link de WhatsApp pronto pra enviar. NÃO dispara e-mail — isso fica
// a cargo de enviarAcessoEmail, pra admin escolher o canal.
async function definirNovaSenha(dados: { alunaId: string; senha?: string }): Promise<ResultadoSenha> {
  'use server';
  if (!UUID.test(dados.alunaId)) return { ok: false, mensagem: 'Aluna inválida.' };
  const admin = await garantirAdmin();
  if (!admin) return { ok: false, mensagem: 'Somente uma administradora conectada pode definir a senha.' };
  const { supabase } = admin;

  const { data: aluna } = await supabase
    .from('profiles')
    .select('id, name, email, phone')
    .eq('id', dados.alunaId)
    .maybeSingle();
  if (!aluna?.email) return { ok: false, mensagem: 'Aluna não encontrada.' };

  const custom = String(dados.senha || '').trim();
  if (custom && custom.length < 6) {
    return { ok: false, mensagem: 'A senha precisa ter pelo menos 6 caracteres.' };
  }
  const senha = custom || gerarSenhaProvisoria();

  const { error: senhaErro } = await supabase.auth.admin.updateUserById(dados.alunaId, { password: senha });
  if (senhaErro) return { ok: false, mensagem: 'Não foi possível definir a nova senha. Tente novamente.' };

  const whatsappUrl = montarWhatsappUrl(aluna.phone, { nome: aluna.name, email: aluna.email, senha });
  return { ok: true, mensagem: 'Senha definida.', senha, whatsappUrl };
}

// Envia (ou reenvia) o e-mail de acesso com a senha que a admin acabou de definir.
// Reafirma a senha no login antes de enviar, garantindo que o e-mail mostre a senha correta.
async function enviarAcessoEmail(dados: { alunaId: string; senha: string }): Promise<Resultado> {
  'use server';
  if (!UUID.test(dados.alunaId)) return { ok: false, mensagem: 'Aluna inválida.' };
  const admin = await garantirAdmin();
  if (!admin) return { ok: false, mensagem: 'Somente uma administradora conectada pode enviar o e-mail.' };
  const { supabase } = admin;

  const senha = String(dados.senha || '').trim();
  if (senha.length < 6) return { ok: false, mensagem: 'Defina a senha antes de enviar o e-mail.' };

  const { data: aluna } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', dados.alunaId)
    .maybeSingle();
  if (!aluna?.email) return { ok: false, mensagem: 'Aluna não encontrada.' };

  const { error: senhaErro } = await supabase.auth.admin.updateUserById(dados.alunaId, { password: senha });
  if (senhaErro) return { ok: false, mensagem: 'Não foi possível confirmar a senha para o envio.' };

  const envio = await sendAccessEmail({
    email: aluna.email,
    name: aluna.name || null,
    tempPassword: senha,
    courseName: null
  });
  if (!envio.ok) return { ok: false, mensagem: 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.' };

  return { ok: true, mensagem: `E-mail enviado para ${aluna.email}.` };
}

async function definirPrazo(dados: { alunaId: string; cursoId: string; tempo: string; dataFim?: string }): Promise<Resultado> {
  'use server';
  if (!UUID.test(dados.alunaId) || !UUID.test(dados.cursoId)) return { ok: false, mensagem: 'Dados inválidos.' };
  const admin = await garantirAdmin();
  if (!admin) return { ok: false, mensagem: 'Somente uma administradora conectada pode alterar o prazo.' };
  const { supabase } = admin;

  const expiracao = calcularExpiracao(dados.tempo, dados.dataFim);
  if (!expiracao) return { ok: false, mensagem: 'Escolha um prazo válido.' };

  const { data: matricula } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', dados.alunaId)
    .eq('course_id', dados.cursoId)
    .maybeSingle();
  if (!matricula) return { ok: false, mensagem: 'Libere o curso antes de definir o prazo.' };

  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'active', expires_at: expiracao, updated_at: new Date().toISOString() })
    .eq('id', matricula.id);
  if (error) return { ok: false, mensagem: 'Não foi possível salvar o novo prazo.' };

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/acesso?id=${dados.alunaId}`);
  revalidatePath('/area');
  const label = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(expiracao));
  return { ok: true, mensagem: `Acesso liberado até ${label}.` };
}

export default async function AcessoCursosPage({ searchParams }: Props) {
  const alunaId = searchParams?.id || '';
  const supabase = createSupabaseAdminClient();

  if (!UUID.test(alunaId)) {
    return (
      <div className="pad">
        <div className="ac-note">Selecione uma aluna na lista de usuários.</div>
        <Link className="btn-pink-sq" href="/admin/usuarios">
          Voltar para usuários
        </Link>
      </div>
    );
  }

  if (!supabase) {
    return <div className="pad">A conexão com o Supabase não está configurada.</div>;
  }

  const [perfilResultado, cursosResultado, matriculasResultado] =
    await Promise.all([
      supabase.from('profiles').select('id, name, email, phone').eq('id', alunaId).maybeSingle(),
      supabase
        .from('courses')
        .select('id, title, subtitle, cover_image_url, sort_order, is_published')
        .order('sort_order', { ascending: true }),
      supabase.from('enrollments').select('course_id, status, expires_at').eq('profile_id', alunaId)
    ]);

  const aluna = perfilResultado.data;
  if (!aluna) {
    return <div className="pad">Aluna não encontrada.</div>;
  }

  const agora = Date.now();
  const matriculaPorCurso = new Map((matriculasResultado.data || []).map((m) => [m.course_id, m]));
  const estaAtiva = (m?: { status: string; expires_at: string | null }) =>
    !!m && m.status === 'active' && (!m.expires_at || new Date(m.expires_at).getTime() >= agora);

  const cursos: CursoAcesso[] = (cursosResultado.data || []).map((curso) => {
    const m = matriculaPorCurso.get(curso.id);
    return {
      id: curso.id,
      titulo: curso.title,
      subtitulo: curso.subtitle || '',
      capa: curso.cover_image_url,
      ativo: estaAtiva(m),
      expiresAt: m?.expires_at || null
    };
  });
  const liberados = cursos.filter((curso) => curso.ativo).length;

  const vencimentos = (matriculasResultado.data || [])
    .filter((m) => m.status === 'active' && m.expires_at)
    .map((m) => new Date(m.expires_at as string).getTime())
    .sort((a, b) => a - b);
  const proximo = vencimentos[0] || null;
  let badge: { tom: string; texto: string } | null = null;
  if (proximo) {
    const dias = Math.ceil((proximo - agora) / (24 * 60 * 60 * 1000));
    if (dias < 0) badge = { tom: 'exp', texto: 'Acesso vencido' };
    else if (dias <= 30) badge = { tom: 'warn', texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}` };
    else badge = { tom: 'ok', texto: 'Acesso ativo' };
  } else if (liberados > 0) {
    badge = { tom: 'ok', texto: 'Acesso ativo' };
  }

  return (
    <>
      <div className="crumb">
        ⚙ Administrador ›{' '}
        <Link href="/admin/usuarios" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Usuários
        </Link>{' '}
        › {aluna.name || 'Aluna'}
      </div>

      <div className="pad">
        <div className="stu-head">
          <span className="ava"><User size={26} /></span>
          <div>
            <h1>{aluna.name || 'Aluna sem nome'}</h1>
            <small>{aluna.email}</small>
            {badge && <div><span className={`stu-badge ${badge.tom}`}>{badge.texto}</span></div>}
          </div>
          <div className="st">
            Cursos liberados
            <b>{liberados} de {cursos.length}</b>
          </div>
        </div>

        <AccessManager
          alunaId={aluna.id}
          alunaNome={aluna.name || 'esta aluna'}
          cursos={cursos}
          salvarAcessos={salvarAcessos}
          dados={{ nome: aluna.name || '', email: aluna.email || '', telefone: aluna.phone || '' }}
          salvarDados={salvarDadosAluna}
          definirNovaSenha={definirNovaSenha}
          enviarAcessoEmail={enviarAcessoEmail}
          definirPrazo={definirPrazo}
        />
      </div>
    </>
  );
}

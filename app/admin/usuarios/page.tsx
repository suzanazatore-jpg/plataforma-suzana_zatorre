import Link from 'next/link';
import { Users, Filter, MessageSquare } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AcoesUsuario, ListaUsuariosButtons } from './user-actions';
import './usuarios.css';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Resultado = { ok: boolean; mensagem: string };
type AlunaImportada = { nome: string; email: string; telefone?: string };

async function validarAdministradora() {
  const clienteSessao = createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  if (!clienteSessao || !supabase) return null;

  const { data } = await clienteSessao.auth.getUser();
  if (!data.user?.id) return null;

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .maybeSingle();

  return perfil?.role === 'admin' && perfil.status === 'active' ? supabase : null;
}

async function criarUsuario(dados: { nome: string; email: string; senha: string }): Promise<Resultado> {
  'use server';
  const supabase = await validarAdministradora();
  if (!supabase) return { ok: false, mensagem: 'Somente uma administradora conectada pode cadastrar alunas.' };

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || dados.senha.length < 6) {
    return { ok: false, mensagem: 'Confira nome, e-mail e senha. A senha precisa ter pelo menos 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { name: nome }
  });
  if (error || !data.user) {
    return { ok: false, mensagem: error?.message?.includes('already') ? 'Já existe uma usuária com este e-mail.' : 'Não foi possível cadastrar a aluna.' };
  }

  const { error: perfilErro } = await supabase.from('profiles').upsert({
    id: data.user.id,
    name: nome,
    email,
    role: 'student',
    status: 'active',
    updated_at: new Date().toISOString()
  });
  if (perfilErro) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return { ok: false, mensagem: 'O login foi criado, mas o cadastro da aluna falhou. Tente novamente.' };
  }

  revalidatePath('/admin/usuarios');
  return { ok: true, mensagem: 'Aluna cadastrada com sucesso.' };
}

async function editarUsuario(dados: { id: string; nome: string; email: string }): Promise<Resultado> {
  'use server';
  const supabase = await validarAdministradora();
  if (!supabase) return { ok: false, mensagem: 'Somente uma administradora conectada pode editar alunas.' };
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!UUID.test(dados.id) || !nome || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, mensagem: 'Confira o nome e o e-mail informados.' };
  }

  const { error: authErro } = await supabase.auth.admin.updateUserById(dados.id, {
    email,
    user_metadata: { name: nome }
  });
  if (authErro) return { ok: false, mensagem: 'Não foi possível atualizar o login desta aluna.' };

  const { error: perfilErro } = await supabase
    .from('profiles')
    .update({ name: nome, email, updated_at: new Date().toISOString() })
    .eq('id', dados.id);
  if (perfilErro) return { ok: false, mensagem: 'O login foi atualizado, mas os dados da lista não. Tente novamente.' };

  revalidatePath('/admin/usuarios');
  revalidatePath(`/admin/usuarios/acesso?id=${dados.id}`);
  return { ok: true, mensagem: 'Dados da aluna atualizados com sucesso.' };
}

async function apagarUsuario(dados: { id: string; emailConfirmacao: string }): Promise<Resultado> {
  'use server';
  const supabase = await validarAdministradora();
  if (!supabase) return { ok: false, mensagem: 'Somente uma administradora conectada pode apagar alunas.' };
  if (!UUID.test(dados.id)) return { ok: false, mensagem: 'Usuária inválida.' };

  const { data: sessao } = await createSupabaseServerClient()!.auth.getUser();
  if (sessao.user?.id === dados.id) return { ok: false, mensagem: 'Você não pode apagar a própria conta de administradora.' };

  const { data: alvo, error: alvoErro } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', dados.id)
    .maybeSingle();
  if (alvoErro || !alvo) return { ok: false, mensagem: 'Aluna não encontrada.' };
  if (alvo.role === 'admin') return { ok: false, mensagem: 'Contas administrativas não podem ser apagadas por esta tela.' };
  if ((alvo.email || '').toLowerCase() !== dados.emailConfirmacao.trim().toLowerCase()) {
    return { ok: false, mensagem: 'O e-mail digitado não confere. A aluna não foi apagada.' };
  }

  const { error } = await supabase.auth.admin.deleteUser(dados.id);
  if (error) return { ok: false, mensagem: 'Não foi possível apagar a aluna. Verifique se ela possui dados vinculados.' };

  const [{ error: matriculasErro }, { error: perfilErro }] = await Promise.all([
    supabase.from('enrollments').delete().eq('profile_id', dados.id),
    supabase.from('profiles').delete().eq('id', dados.id)
  ]);
  if (matriculasErro || perfilErro) {
    console.error('Limpeza parcial após apagar login:', { matriculasErro, perfilErro, id: dados.id });
    return { ok: false, mensagem: 'O login foi apagado, mas restaram dados para limpeza técnica.' };
  }
  revalidatePath('/admin/usuarios');
  return { ok: true, mensagem: 'Aluna apagada com sucesso.' };
}


async function importarUsuarios(dados: AlunaImportada[]): Promise<Resultado> {
  'use server';
  const supabase = await validarAdministradora();
  if (!supabase) return { ok: false, mensagem: 'Somente uma administradora conectada pode importar alunas.' };
  if (!Array.isArray(dados) || dados.length === 0) return { ok: false, mensagem: 'A planilha não contém alunas para importar.' };
  if (dados.length > 500) return { ok: false, mensagem: 'Importe no máximo 500 alunas por vez.' };

  const unicas = new Map<string, AlunaImportada>();
  let invalidas = 0;
  for (const item of dados) {
    const nome = String(item.nome || '').trim();
    const email = String(item.email || '').trim().toLowerCase();
    const telefone = String(item.telefone || '').replace(/\D/g, '');
    if (!nome || !/^\S+@\S+\.\S+$/.test(email)) {
      invalidas++;
      continue;
    }
    if (!unicas.has(email)) unicas.set(email, { nome, email, telefone });
  }

  let criadas = 0;
  let duplicadas = dados.length - invalidas - unicas.size;
  let falhas = 0;

  for (const aluna of Array.from(unicas.values())) {
    const { data: perfilExistente } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', aluna.email)
      .maybeSingle();

    if (perfilExistente) {
      duplicadas++;
      continue;
    }

    // Criação silenciosa: sem senha, sem e-mail, sem WhatsApp e sem matrícula automática.
    const { data: authData, error: authErro } = await supabase.auth.admin.createUser({
      email: aluna.email,
      email_confirm: true,
      user_metadata: { name: aluna.nome, phone: aluna.telefone || null, source: 'csv_import' }
    });

    if (authErro || !authData.user) {
      if (authErro?.message?.toLowerCase().includes('already')) duplicadas++;
      else falhas++;
      continue;
    }

    const { error: perfilErro } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      name: aluna.nome,
      email: aluna.email,
      phone: aluna.telefone || null,
      role: 'student',
      status: 'active',
      updated_at: new Date().toISOString()
    });

    if (perfilErro) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      falhas++;
      continue;
    }
    criadas++;
  }

  revalidatePath('/admin/usuarios');
  const partes = [`${criadas} criada${criadas === 1 ? '' : 's'}`];
  if (duplicadas) partes.push(`${duplicadas} duplicada${duplicadas === 1 ? '' : 's'} ignorada${duplicadas === 1 ? '' : 's'}`);
  if (invalidas) partes.push(`${invalidas} linha${invalidas === 1 ? '' : 's'} inválida${invalidas === 1 ? '' : 's'}`);
  if (falhas) partes.push(`${falhas} falha${falhas === 1 ? '' : 's'}`);
  return { ok: falhas === 0, mensagem: `Importação concluída: ${partes.join(', ')}. Nenhum aviso ou senha foi enviado.` };
}

function formatarData(data?: string | null) {
  if (!data) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(data));
}

function formatarUltimoAcesso(data?: string | null) {
  if (!data) return { acesso: 'nunca acessou', acessoSub: '—' };
  const valor = new Date(data);
  return {
    acesso: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(valor),
    acessoSub: `às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }).format(valor)}`
  };
}

function criarIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export default async function UsuariosPage() {
  const supabase = createSupabaseAdminClient();
  let alunas: any[] = [];
  let erroConexao = false;

  if (!supabase) erroConexao = true;
  else {
    const [{ data: profiles, error: profilesError }, { data: enrollments, error: enrollmentsError }, { data: authData, error: authError }] = await Promise.all([
      supabase.from('profiles').select('id, name, email, status, created_at').order('created_at', { ascending: false }),
      supabase.from('enrollments').select('profile_id, status, expires_at'),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);
    if (profilesError || enrollmentsError || authError) erroConexao = true;
    else {
      alunas = (profiles || []).map((profile) => {
        const matriculas = (enrollments || []).filter((item) => item.profile_id === profile.id);
        const usuarioAuth = authData?.users?.find((usuario) => usuario.id === profile.id);
        const ultimoAcesso = formatarUltimoAcesso(usuarioAuth?.last_sign_in_at);
        const vencimentos = matriculas.map((item) => item.expires_at).filter(Boolean).sort();
        const vencimentoMaisProximo = vencimentos[0] || null;
        const venceu = vencimentoMaisProximo ? new Date(vencimentoMaisProximo).getTime() < Date.now() : false;
        const faltamTrintaDias = vencimentoMaisProximo ? new Date(vencimentoMaisProximo).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && !venceu : false;
        const ativo = profile.status === 'active' && matriculas.some((item) => item.status === 'active') && !venceu;
        return {
          id: profile.id, ini: criarIniciais(profile.name || profile.email || 'Aluna'), nome: profile.name || 'Aluna sem nome', email: profile.email || '',
          cadastradaEm: formatarData(profile.created_at), acesso: ultimoAcesso.acesso, acessoSub: ultimoAcesso.acessoSub,
          vencLabel: venceu ? 'venceu em' : 'acesso até', vencData: formatarData(vencimentoMaisProximo), vencTom: venceu ? 'exp' : faltamTrintaDias ? 'warn' : '',
          cursos: matriculas.length === 0 ? 'Sem acesso' : matriculas.length === 1 ? '1 curso' : `${matriculas.length} cursos`, ativo
        };
      });
    }
  }

  return <>
    <div className="crumb">⚙ Administrador › Usuários</div>
    <div className="pad">
      <div className="blk-title">Usuários</div>
      <p className="blk-sub">Cadastre alunas, acompanhe o acesso e libere os cursos de cada uma.</p>
      <div className="u-summary"><div className="ic"><Users size={26} /></div><div className="t">Total de alunas cadastradas<b>{alunas.length} {alunas.length === 1 ? 'aluna' : 'alunas'}</b></div></div>
      <div className="utitle"><div><h2>Lista de alunas</h2><p>Clique numa aluna para gerenciar o acesso aos cursos.</p></div><div className="tools"><ListaUsuariosButtons importarUsuarios={importarUsuarios} /><button className="btn-ghost"><Filter size={15} /> Filtrar</button></div></div>
      {erroConexao ? <div className="u-panel" style={{ padding: 24 }}>Não foi possível carregar os usuários do Supabase.</div> :
      <div className="u-panel"><table className="utable"><thead><tr><th>Aluna</th><th className="hide">Cadastrada em</th><th>Último acesso</th><th>Vencimento</th><th className="hide">Cursos</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead><tbody>
        {alunas.length === 0 ? <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>Nenhuma aluna cadastrada.</td></tr> : alunas.map((a) => <tr key={a.id}>
          <td><Link href={`/admin/usuarios/acesso?id=${a.id}`} style={{ color: 'inherit', textDecoration: 'none' }}><div className="uinfo"><span className="ava">{a.ini}</span><div><strong>{a.nome}</strong><small>{a.email}</small></div></div></Link></td>
          <td className="hide dt">{a.cadastradaEm}</td><td className="dt">{a.acesso}<small>{a.acessoSub}</small></td><td className={`venc ${a.vencTom}`}>{a.vencLabel}<small>{a.vencData}</small></td><td className="hide cursos">{a.cursos}</td><td><span className={a.ativo ? 'toggle on' : 'toggle off'} /></td>
          <td><div className="acts"><span className="iconbtn" title="Mensagem"><MessageSquare size={14} /></span><AcoesUsuario id={a.id} nome={a.nome} email={a.email} editarUsuario={editarUsuario} apagarUsuario={apagarUsuario} /></div></td>
        </tr>)}
      </tbody></table></div>}
    </div>
  </>;
}

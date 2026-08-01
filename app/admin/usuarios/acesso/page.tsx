import Link from 'next/link';
import { Info, User } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AccessManager, { type CursoAcesso } from './access-manager';
import './acesso.css';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { id?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function salvarAcessos(alunaId: string, cursosAtivos: string[]) {
  'use server';

  if (!UUID.test(alunaId) || cursosAtivos.some((id) => !UUID.test(id))) {
    return { ok: false, mensagem: 'Dados de acesso inválidos.' };
  }

  const clienteSessao = createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  if (!clienteSessao || !supabase) {
    return { ok: false, mensagem: 'A conexão com o Supabase não está configurada.' };
  }

  const { data: autenticacao } = await clienteSessao.auth.getUser();
  const adminId = autenticacao.user?.id;
  if (!adminId) {
    return { ok: false, mensagem: 'Sua sessão expirou. Entre novamente para salvar.' };
  }

  const { data: perfilAdmin } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', adminId)
    .maybeSingle();

  if (perfilAdmin?.role !== 'admin' || perfilAdmin.status !== 'active') {
    return { ok: false, mensagem: 'Somente uma administradora pode alterar acessos.' };
  }

  const [{ data: aluna }, { data: cursos }, { data: matriculas, error }] =
    await Promise.all([
      supabase.from('profiles').select('id').eq('id', alunaId).maybeSingle(),
      supabase.from('courses').select('id'),
      supabase
        .from('enrollments')
        .select('id, course_id, status')
        .eq('profile_id', alunaId)
    ]);

  if (!aluna || error) {
    return { ok: false, mensagem: 'Não foi possível localizar a aluna.' };
  }

  const idsCursos = new Set((cursos || []).map((curso) => curso.id));
  if (cursosAtivos.some((id) => !idsCursos.has(id))) {
    return { ok: false, mensagem: 'Um dos cursos selecionados não existe mais.' };
  }

  const ativos = new Set(cursosAtivos);
  const existentes = new Map(
    (matriculas || []).map((matricula) => [matricula.course_id, matricula])
  );

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
      Boolean(resultado.error)
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
      supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', alunaId)
        .maybeSingle(),
      supabase
        .from('courses')
        .select('id, title, subtitle, cover_image_url, sort_order, is_published')
        .order('sort_order', { ascending: true }),
      supabase
        .from('enrollments')
        .select('course_id, status, expires_at')
        .eq('profile_id', alunaId)
    ]);

  const aluna = perfilResultado.data;
  if (!aluna) {
    return <div className="pad">Aluna não encontrada.</div>;
  }

  const agora = Date.now();
  const matriculasAtivas = new Set(
    (matriculasResultado.data || [])
      .filter(
        (matricula) =>
          matricula.status === 'active' &&
          (!matricula.expires_at ||
            new Date(matricula.expires_at).getTime() >= agora)
      )
      .map((matricula) => matricula.course_id)
  );

  const cursos: CursoAcesso[] = (cursosResultado.data || []).map((curso) => ({
    id: curso.id,
    titulo: curso.title,
    subtitulo: curso.subtitle || '',
    capa: curso.cover_image_url,
    ativo: matriculasAtivas.has(curso.id)
  }));
  const liberados = cursos.filter((curso) => curso.ativo).length;

  return (
    <>
      <div className="crumb">
        ⚙ Administrador ›{' '}
        <Link href="/admin/usuarios" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Usuários
        </Link>{' '}
        › {aluna.name || 'Aluna'} › Acesso aos Cursos
      </div>

      <div className="pad">
        <div className="stu-head">
          <span className="ava"><User size={26} /></span>
          <div>
            <h1>{aluna.name || 'Aluna sem nome'}</h1>
            <small>{aluna.email}</small>
          </div>
          <div className="st">
            Cursos liberados
            <b>{liberados} de {cursos.length}</b>
          </div>
        </div>

        <div className="tabs">
          <span>Dados</span>
          <span className="on">Acesso aos Cursos</span>
          <span>Histórico</span>
        </div>

        <AccessManager
          alunaId={aluna.id}
          alunaNome={aluna.name || 'esta aluna'}
          cursos={cursos}
          salvarAcessos={salvarAcessos}
        />

        <div className="ac-note">
          <Info size={16} />
          Quando a compra vem pelo checkout, o acesso ao curso é liberado
          automaticamente. Esta tela é para liberar ou bloquear na mão —
          cortesia, suporte ou reembolso.
        </div>
      </div>
    </>
  );
}

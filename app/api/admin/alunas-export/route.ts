import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function csv(valor: unknown) {
  const texto = String(valor ?? '').replace(/"/g, '""');
  return `"${texto}"`;
}

export async function GET() {
  const sessao = createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  if (!sessao || !supabase) return NextResponse.json({ erro: 'Configuração indisponível.' }, { status: 500 });

  const { data: usuario } = await sessao.auth.getUser();
  if (!usuario.user?.id) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });

  const { data: admin } = await supabase.from('profiles').select('role, status').eq('id', usuario.user.id).maybeSingle();
  if (admin?.role !== 'admin' || admin.status !== 'active') {
    return NextResponse.json({ erro: 'Acesso permitido somente para administradoras.' }, { status: 403 });
  }

  const [{ data: perfis, error: perfisErro }, { data: matriculas, error: matriculasErro }, { data: cursos, error: cursosErro }] =
    await Promise.all([
      supabase.from('profiles').select('id, name, email, phone, status, created_at').eq('role', 'student').order('created_at'),
      supabase.from('enrollments').select('profile_id, course_id, status'),
      supabase.from('courses').select('id, title')
    ]);

  if (perfisErro || matriculasErro || cursosErro) {
    return NextResponse.json({ erro: 'Não foi possível gerar a lista.' }, { status: 500 });
  }

  const nomesCursos = new Map((cursos || []).map((curso) => [curso.id, curso.title]));
  const linhas = (perfis || []).map((perfil) => {
    const ativos = (matriculas || [])
      .filter((matricula) => matricula.profile_id === perfil.id && matricula.status === 'active')
      .map((matricula) => nomesCursos.get(matricula.course_id))
      .filter(Boolean)
      .join(', ');
    return [
      csv(perfil.name), csv(perfil.email), csv(perfil.phone), csv(perfil.status),
      csv(perfil.created_at ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(perfil.created_at)) : ''),
      csv(ativos)
    ].join(';');
  });

  const conteudo = '\uFEFF' + ['"Nome";"Email";"Telefone";"Status";"Cadastro";"Cursos ativos"', ...linhas].join('\r\n');
  const data = new Date().toISOString().slice(0, 10);
  return new NextResponse(conteudo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="alunas-${data}.csv"`,
      'Cache-Control': 'no-store'
    }
  });
}

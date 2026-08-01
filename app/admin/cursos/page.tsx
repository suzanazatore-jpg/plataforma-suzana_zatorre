import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NovoCursoButton } from './course-actions';
import './cursos.css';

export const dynamic = 'force-dynamic';
type Resultado = { ok: boolean; mensagem: string; id?: string };

async function admin() {
  const sessao = createSupabaseServerClient(); const db = createSupabaseAdminClient();
  if (!sessao || !db) return null;
  const { data } = await sessao.auth.getUser(); if (!data.user) return null;
  const { data: p } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  return p?.role === 'admin' && p.status === 'active' ? db : null;
}

async function criarCurso(d: { titulo: string; slug: string }): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode cadastrar cursos.' };
  const title = d.titulo.trim(); const slug = d.slug.trim().toLowerCase();
  if (!title || !/^[a-z0-9-]+$/.test(slug)) return { ok: false, mensagem: 'Confira o nome e o código interno do curso.' };
  const { data, error } = await db.from('courses').insert({ title, slug, is_published: false, sort_order: 0 }).select('id').single();
  if (error) return { ok: false, mensagem: error.code === '23505' ? 'Já existe um curso com este código.' : 'Não foi possível criar o curso.' };
  revalidatePath('/admin/cursos'); return { ok: true, mensagem: 'Curso criado com sucesso.', id: data.id };
}

export default async function CursosPage() {
  const db = createSupabaseAdminClient();
  const { data: cursos, error } = db ? await db.from('courses').select('id,slug,title,cover_image_url,sort_order,is_published,modules(id,lessons(id))').order('sort_order').order('created_at') : { data: null, error: true as any };
  return <><div className="crumb">⚙ Administrador › Cursos</div><div className="pad">
    <div className="head-row"><div><div className="blk-title">Cursos e Aulas</div><p className="blk-sub">Crie e organize seus cursos, módulos e aulas.</p></div><NovoCursoButton criar={criarCurso} /></div>
    {error ? <div className="module" style={{padding:24}}>Não foi possível carregar os cursos do Supabase.</div> :
    <div className="cgrid">{(cursos || []).map((c:any) => { const mods=c.modules||[]; const aulas=mods.reduce((n:number,m:any)=>n+(m.lessons?.length||0),0); return <Link className="ccard" href={`/admin/cursos/editar?id=${c.id}`} key={c.id}>
      <div className="cthumb t-pk" style={c.cover_image_url ? {backgroundImage:`url(${c.cover_image_url})`,backgroundSize:'cover',backgroundPosition:'center'}:{}}><span>{c.title}</span></div>
      <div className="cbody"><h3>{c.title}</h3><div className="meta">{mods.length} módulos · {aulas} aulas</div><div className="cfoot"><span className={`badge ${c.is_published?'on':'off'}`}>{c.is_published?'Publicado':'Rascunho'}</span><span className="edit-link">Editar →</span></div></div>
    </Link>;})}</div>}
  </div></>;
}

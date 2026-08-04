import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CarrosseisAdmin } from './carrossel-actions';

export const dynamic = 'force-dynamic';
type Resultado = { ok: boolean; mensagem: string; id?: string };

async function admin() {
  const sessao = createSupabaseServerClient();
  const db = createSupabaseAdminClient();
  if (!sessao || !db) return null;
  const { data } = await sessao.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  return p?.role === 'admin' && p.status === 'active' ? db : null;
}

async function criarShelf(d: { title: string; subtitle: string; courseIds: string[]; publicado: boolean }): Promise<Resultado> {
  'use server';
  const db = await admin();
  if (!db) return { ok: false, mensagem: 'Acesso administrativo necessário.' };
  const title = d.title.trim();
  if (!title) return { ok: false, mensagem: 'Dê um nome para o carrossel.' };
  const { data: maxRow } = await db.from('course_shelves').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;
  const { data: shelf, error } = await db.from('course_shelves').insert({ title, subtitle: d.subtitle?.trim() || null, is_published: Boolean(d.publicado), sort_order: nextOrder }).select('id').single();
  if (error || !shelf) return { ok: false, mensagem: 'Não foi possível criar o carrossel.' };
  const ids = (d.courseIds || []).filter(Boolean);
  if (ids.length) {
    const rows = ids.map((cid, i) => ({ shelf_id: shelf.id, course_id: cid, sort_order: i }));
    const { error: e2 } = await db.from('shelf_courses').insert(rows);
    if (e2) return { ok: false, mensagem: 'Carrossel criado, mas houve erro ao vincular os cursos.' };
  }
  revalidatePath('/admin/carrosseis');
  revalidatePath('/area');
  return { ok: true, mensagem: 'Carrossel criado.', id: shelf.id };
}

async function editarShelf(d: { id: string; title: string; subtitle: string; courseIds: string[]; publicado: boolean }): Promise<Resultado> {
  'use server';
  const db = await admin();
  if (!db) return { ok: false, mensagem: 'Acesso administrativo necessário.' };
  const title = d.title.trim();
  if (!title) return { ok: false, mensagem: 'Dê um nome para o carrossel.' };
  const { error } = await db.from('course_shelves').update({ title, subtitle: d.subtitle?.trim() || null, is_published: Boolean(d.publicado), updated_at: new Date().toISOString() }).eq('id', d.id);
  if (error) return { ok: false, mensagem: 'Não foi possível salvar o carrossel.' };
  await db.from('shelf_courses').delete().eq('shelf_id', d.id);
  const ids = (d.courseIds || []).filter(Boolean);
  if (ids.length) {
    const rows = ids.map((cid, i) => ({ shelf_id: d.id, course_id: cid, sort_order: i }));
    const { error: e2 } = await db.from('shelf_courses').insert(rows);
    if (e2) return { ok: false, mensagem: 'Carrossel salvo, mas houve erro ao atualizar os cursos.' };
  }
  revalidatePath('/admin/carrosseis');
  revalidatePath('/area');
  return { ok: true, mensagem: 'Carrossel salvo.' };
}

async function apagarShelf(id: string): Promise<Resultado> {
  'use server';
  const db = await admin();
  if (!db) return { ok: false, mensagem: 'Acesso administrativo necessário.' };
  const { error } = await db.from('course_shelves').delete().eq('id', id);
  if (error) return { ok: false, mensagem: 'Não foi possível apagar o carrossel.' };
  revalidatePath('/admin/carrosseis');
  revalidatePath('/area');
  return { ok: true, mensagem: 'Carrossel apagado.' };
}

async function publicarShelf(id: string, isPublished: boolean): Promise<Resultado> {
  'use server';
  const db = await admin();
  if (!db) return { ok: false, mensagem: 'Acesso administrativo necessário.' };
  const { error } = await db.from('course_shelves').update({ is_published: isPublished, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, mensagem: 'Não foi possível atualizar.' };
  revalidatePath('/admin/carrosseis');
  revalidatePath('/area');
  return { ok: true, mensagem: isPublished ? 'Carrossel publicado.' : 'Carrossel ocultado.' };
}

export default async function CarrosseisPage() {
  const db = createSupabaseAdminClient();
  let shelvesData: any[] = [];
  let coursesData: any[] = [];
  let erro = false;

  if (db) {
    const [shelvesRes, linksRes, coursesRes] = await Promise.all([
      db.from('course_shelves').select('id,title,subtitle,is_published,sort_order').order('sort_order'),
      db.from('shelf_courses').select('shelf_id,course_id,sort_order').order('sort_order'),
      db.from('courses').select('id,title,cover_image_url').order('title'),
    ]);
    if (shelvesRes.error || coursesRes.error) {
      erro = true;
    } else {
      coursesData = coursesRes.data || [];
      const byId: Record<string, any> = {};
      coursesData.forEach((c: any) => { byId[c.id] = c; });
      const links = linksRes.data || [];
      shelvesData = (shelvesRes.data || []).map((sh: any) => ({
        ...sh,
        courses: links
          .filter((l: any) => l.shelf_id === sh.id)
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((l: any) => byId[l.course_id])
          .filter(Boolean),
      }));
    }
  } else {
    erro = true;
  }

  return (
    <>
      <div className="crumb">⚙ Administrador › Carrosséis</div>
      <div className="pad">
        {erro ? (
          <div className="szc-erro" style={{ background: '#141416', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 24, color: '#9a9aa2' }}>
            Não foi possível carregar os carrosséis do Supabase. Confira se a Etapa 1 (tabelas) foi executada.
          </div>
        ) : (
          <CarrosseisAdmin shelves={shelvesData} allCourses={coursesData} criar={criarShelf} editar={editarShelf} apagar={apagarShelf} publicar={publicarShelf} />
        )}
      </div>
    </>
  );
}

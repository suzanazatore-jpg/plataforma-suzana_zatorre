import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Download, Play } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveMaterialUrl } from '@/lib/supabase/material-url';
import '@/app/area/evs/evs.css';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export default async function PreviewCurso({ searchParams }: { searchParams?: { id?: string; aula?: string } }) {
  const id = searchParams?.id || '';
  if (!UUID.test(id)) redirect('/admin/cursos');
  const session = createSupabaseServerClient();
  const db = createSupabaseAdminClient();
  if (!session || !db) redirect('/');
  const { data: auth } = await session.auth.getUser();
  if (!auth.user) redirect('/');
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', auth.user.id).maybeSingle();
  if (profile?.role !== 'admin' || profile.status !== 'active') redirect('/acesso-negado');

  const { data: course } = await db.from('courses').select('id,title,description,subtitle').eq('id', id).maybeSingle();
  if (!course) redirect('/admin/cursos');
  const { data: modules } = await db.from('modules').select('id,title,sort_order,lessons(id,title,description,video_url,thumbnail_url,duration_label,sort_order,materials(id,title,file_url))').eq('course_id', id).order('sort_order').order('sort_order', { referencedTable: 'lessons' });
  const lessons = (modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => ({ ...l, moduleTitle: m.title })));
  const current = lessons.find((l: any) => l.id === searchParams?.aula) || lessons[0];
  const currentIndex = lessons.findIndex((l: any) => l.id === current?.id);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const materials = current ? await Promise.all((current.materials || []).map(async (m: any) => ({ ...m, url: await resolveMaterialUrl(db, m.file_url) }))) : [];
  const { data: courseExtraRows } = await db.from('materials').select('id,title,file_url,sort_order').eq('course_id', id).is('lesson_id', null).eq('is_published', true).order('sort_order');
  const courseExtras = await Promise.all((courseExtraRows || []).map(async (m: any) => ({ ...m, url: await resolveMaterialUrl(db, m.file_url) })));

  return <div className="ep-page">
    <header className="ep-bar">
      <Link className="ep-back" href={`/admin/cursos/editar?id=${id}`} aria-label="Voltar"><ArrowLeft size={16}/></Link>
      <img className="ep-logo" src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre"/>
      <div className="ep-title"><small>PRÉVIA — VISÃO DA ALUNA · 0% concluído · {lessons.length} aulas</small><h1>{current?.title || course.title}</h1></div>
      <div className="ep-who"><span>Olá, Aluna</span><span className="ep-avatar">A</span></div>
    </header>
    <div className="ep-grid"><div>
      <div className="ep-video">
        {current?.video_url ? <iframe src={current.video_url} title={current.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/> : <><button type="button" className="ep-play" aria-label="Aula sem vídeo"><Play size={28} fill="currentColor"/></button></>}
      </div>
      <div className="ep-tabs"><span className="on">Informações</span><span>Comentários</span></div>
      <p className="ep-desc">{current?.description || course.description || course.subtitle || 'Curso sem descrição.'}</p>
      {current ? <div className="ep-course-actions">
        <Link className={`ep-nav-button ${!previousLesson ? 'disabled' : ''}`} href={previousLesson ? `/preview/curso?id=${id}&aula=${previousLesson.id}` : '#'} aria-disabled={!previousLesson}>Aula anterior</Link>
        <button className="ep-complete-button" type="button">Marcar como concluída</button>
        <Link className={`ep-nav-button ${!nextLesson ? 'disabled' : ''}`} href={nextLesson ? `/preview/curso?id=${id}&aula=${nextLesson.id}` : '#'} aria-disabled={!nextLesson}>Próxima aula</Link>
      </div> : null}
      <div className="ep-materials"><h3>Materiais desta aula</h3>{materials.length ? <div className="ep-mlist">{materials.map((m:any)=><a href={m.url} key={m.id} target="_blank" rel="noreferrer"><Download size={16}/><span>{m.title}</span></a>)}</div> : <p className="ep-empty-note">Nenhum material de apoio cadastrado para esta aula.</p>}</div>
    </div><aside><div className="ep-side-card"><div className="ep-side-head"><span className="ep-chk"><CheckCircle2 size={16}/></span>{course.title}</div><div className="ep-lessonlist">
      {lessons.length ? lessons.map((l:any,i:number)=><Link className={`ep-li ${l.id===current?.id?'current':''}`} href={`/preview/curso?id=${id}&aula=${l.id}`} key={l.id}><span className="ep-dot"><CheckCircle2 size={13}/></span><span>{i+1}. {l.title}</span></Link>) : <p className="ep-empty-note">Cadastre uma aula para visualizar o curso.</p>}
    </div></div>
    {courseExtras.length ? <div className="ep-side-card ep-materials-panel"><div className="ep-side-head"><span className="ep-chk"><Download size={16}/></span>Material Extra</div><div className="ep-mlist ep-mlist-panel">{courseExtras.map((m:any)=><a href={m.url} key={m.id} target="_blank" rel="noreferrer"><Download size={16}/><span>{m.title}</span></a>)}</div></div> : null}
    </aside></div>
  </div>;
}

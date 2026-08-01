import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, CheckCircle2, Download, Headphones, Play } from 'lucide-react';
import { supportUrl } from '@/lib/course';
import { logoutStudent } from '@/app/actions/auth';
import { resolveMaterialUrl } from '@/lib/supabase/material-url';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentStudent, hasActiveEnrollment } from '@/lib/supabase/session';
import '../evs/evs.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function toggleLessonProgress(formData: FormData) {
  'use server';
  const lessonId = String(formData.get('lessonId') || '');
  const courseSlug = String(formData.get('courseSlug') || '');
  if (!UUID.test(lessonId) || !courseSlug) return;

  const supabase = createSupabaseServerClient();
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .eq('is_published', true)
    .maybeSingle();
  if (!lesson) return;

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', auth.user.id)
    .eq('course_id', lesson.course_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!enrollment) return;

  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('profile_id', auth.user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  const completed = !existing?.completed;
  await supabase.from('lesson_progress').upsert({
    profile_id: auth.user.id,
    lesson_id: lessonId,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id,lesson_id' });
  revalidatePath(`/area/${courseSlug}`);
}

export default async function CoursePage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { aula?: string };
}) {
  const student = await getCurrentStudent();
  if (!student) redirect('/?erro=login');

  const slug = params.slug.toLowerCase();
  if (!(await hasActiveEnrollment(slug))) redirect('/acesso-negado');

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/');
  const { data: course } = await supabase
    .from('courses')
    .select('id,title,description,subtitle')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (!course) redirect('/area');

  const { data: modules } = await supabase
    .from('modules')
    .select('id,title,sort_order,is_published,lessons(id,title,slug,description,video_url,thumbnail_url,duration_label,sort_order,is_published)')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'lessons' });
  const lessons = (modules || []).flatMap((module: any) =>
    (module.lessons || [])
      .filter((lesson: any) => lesson.is_published)
      .map((lesson: any) => ({ ...lesson, moduleTitle: module.title }))
  );
  if (!lessons.length) redirect('/area');

  const lessonIds = lessons.map((lesson: any) => lesson.id);
  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id,completed,updated_at')
    .eq('profile_id', student.userId)
    .in('lesson_id', lessonIds)
    .order('updated_at', { ascending: false });
  const completedIds = new Set((progressRows || []).filter((row: any) => row.completed).map((row: any) => row.lesson_id));
  const progress = Math.round((completedIds.size / lessons.length) * 100);
  const current = lessons.find((lesson: any) => lesson.slug === searchParams?.aula)
    || lessons.find((lesson: any) => lesson.id === progressRows?.[0]?.lesson_id)
    || lessons[0];
  const currentIndex = lessons.findIndex((lesson: any) => lesson.id === current.id);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const { data: lessonMaterialRows } = await supabase
    .from('materials')
    .select('id,title,file_url,sort_order')
    .eq('lesson_id', current.id)
    .eq('is_published', true)
    .order('sort_order');
  const lessonMaterials = await Promise.all((lessonMaterialRows || []).map(async (material: any) => ({
    ...material,
    url: await resolveMaterialUrl(supabase, material.file_url)
  })));
  const { data: extraRows } = await supabase
    .from('materials')
    .select('id,title,file_url,sort_order')
    .eq('course_id', course.id)
    .is('lesson_id', null)
    .eq('is_published', true)
    .order('sort_order');
  const extras = await Promise.all((extraRows || []).map(async (material: any) => ({
    ...material,
    url: await resolveMaterialUrl(supabase, material.file_url)
  })));
  const initial = student.displayName.charAt(0).toUpperCase();

  return <div className="ep-page">
    <header className="ep-bar">
      <Link className="ep-back" href="/area" aria-label="Voltar para meus cursos"><ArrowLeft size={16}/></Link>
      <img className="ep-logo" src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre"/>
      <div className="ep-title"><small>{progress}% concluído · {lessons.length} aulas</small><h1>{current.title}</h1></div>
      <div className="ep-who"><span>Olá, {student.displayName}</span><span className="ep-avatar">{initial}</span></div>
    </header>
    <div className="ep-grid"><div>
      <div className="ep-video">{current.video_url ? <iframe src={current.video_url} title={current.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/> : <button type="button" className="ep-play" aria-label="Aula sem vídeo"><Play size={28} fill="currentColor"/></button>}</div>
      <div className="ep-tabs"><span className="on">Informações</span><span>Comentários</span></div>
      <p className="ep-desc">{current.description || course.description || course.subtitle || 'Curso sem descrição.'}</p>
      <div className="ep-course-actions">
        <Link className={`ep-nav-button ${!previousLesson ? 'disabled' : ''}`} href={previousLesson ? `/area/${slug}?aula=${previousLesson.slug}` : '#'} aria-disabled={!previousLesson}>Aula anterior</Link>
        <form action={toggleLessonProgress}><input type="hidden" name="lessonId" value={current.id}/><input type="hidden" name="courseSlug" value={slug}/><button className={`ep-complete-button ${completedIds.has(current.id) ? 'completed' : ''}`} type="submit">{completedIds.has(current.id) ? 'Aula concluída' : 'Marcar como concluída'}</button></form>
        <Link className={`ep-nav-button ${!nextLesson ? 'disabled' : ''}`} href={nextLesson ? `/area/${slug}?aula=${nextLesson.slug}` : '#'} aria-disabled={!nextLesson}>Próxima aula</Link>
      </div>
      <div className="ep-materials"><h3>Materiais desta aula</h3>{lessonMaterials.length ? <div className="ep-mlist">{lessonMaterials.map((material:any)=><a href={material.url} key={material.id} target="_blank" rel="noreferrer"><Download size={16}/><span>{material.title}</span></a>)}</div> : <p className="ep-empty-note">Nenhum material de apoio cadastrado para esta aula.</p>}</div>
    </div><aside>
      <div className="ep-side-card"><div className="ep-side-head"><span className="ep-chk"><CheckCircle2 size={16}/></span>{course.title}</div><div className="ep-lessonlist">{lessons.map((lesson:any,index:number)=><Link className={`ep-li ${lesson.id===current.id?'current':''} ${completedIds.has(lesson.id)?'done':''}`} href={`/area/${slug}?aula=${lesson.slug}`} key={lesson.id}><span className="ep-dot"><CheckCircle2 size={13}/></span><span>{index+1}. {lesson.title}</span></Link>)}</div></div>
      {extras.length ? <div className="ep-side-card ep-materials-panel"><div className="ep-side-head"><span className="ep-chk"><Download size={16}/></span>Material Extra</div><div className="ep-mlist ep-mlist-panel">{extras.map((material:any)=><a href={material.url} key={material.id} target="_blank" rel="noreferrer"><Download size={16}/><span>{material.title}</span></a>)}</div></div> : null}
    </aside></div>
    <div className="ep-supportbar"><a href={supportUrl} target="_blank" rel="noopener noreferrer"><Headphones size={15}/> Dúvidas sobre esta aula? Fale com o suporte</a><form action={logoutStudent}><button type="submit">Sair</button></form></div>
  </div>;
}

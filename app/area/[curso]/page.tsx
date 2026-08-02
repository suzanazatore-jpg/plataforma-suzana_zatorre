import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, CheckCircle2, Download, Play } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentStudent } from '@/lib/supabase/session';
import { logoutStudent } from '@/app/actions/auth';
import { CourseTabs } from '@/app/area/course-tabs';
import { MaterialDownload } from '@/app/area/material-download';
import '@/app/area/evs/evs.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function addLessonComment(formData: FormData) {
  'use server';
  const lessonId = String(formData.get('lessonId') || '');
  const courseSlug = String(formData.get('courseSlug') || '');
  const body = String(formData.get('body') || '').trim();
  if (!UUID.test(lessonId) || !courseSlug || !body || body.length > 1000) return;

  const supabase = createSupabaseServerClient();
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from('lesson_comments').insert({
    lesson_id: lessonId,
    profile_id: auth.user.id,
    body
  });
  revalidatePath(`/area/${courseSlug}`);
}

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
  if (!enrollment) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', auth.user.id)
      .maybeSingle();
    const isActiveAdmin = profile?.role === 'admin' && profile.status === 'active';
    if (!isActiveAdmin) return;
  }

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
  params: { curso: string };
  searchParams?: { aula?: string; tab?: string };
}) {
  const student = await getCurrentStudent();
  if (!student) redirect('/?erro=login');

  const session = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!session || !admin) redirect('/area');

  const { data: course } = await admin
    .from('courses')
    .select('id, slug, title, description, subtitle, comments_enabled')
    .eq('slug', params.curso)
    .eq('is_published', true)
    .maybeSingle();
  if (!course) redirect('/area');

  const isAdmin = student.profile?.role === 'admin' && student.profile.status === 'active';
  if (!isAdmin) {
    const { data: enrollment } = await session
      .from('enrollments')
      .select('id')
      .eq('profile_id', student.userId)
      .eq('course_id', course.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!enrollment) redirect('/acesso-negado');
  }

  const { data: modules } = await admin
    .from('modules')
    .select('id,title,sort_order,lessons(id,title,slug,description,video_url,thumbnail_url,duration_label,sort_order,is_published)')
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
  const { data: progressRows } = await session
    .from('lesson_progress')
    .select('lesson_id, completed, updated_at')
    .eq('profile_id', student.userId)
    .in('lesson_id', lessonIds)
    .order('updated_at', { ascending: false });
  const completedIds = new Set((progressRows || []).filter((row: any) => row.completed).map((row: any) => row.lesson_id));
  const current = lessons.find((lesson: any) => lesson.id === searchParams?.aula || lesson.slug === searchParams?.aula)
    || lessons.find((lesson: any) => lesson.id === progressRows?.[0]?.lesson_id)
    || lessons[0];
  const currentIndex = lessons.findIndex((lesson: any) => lesson.id === current.id);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const progress = Math.round((completedIds.size / lessons.length) * 100);

  const { data: lessonMaterialRows } = await admin
    .from('materials')
    .select('id,title,file_url,sort_order')
    .eq('lesson_id', current.id)
    .eq('is_published', true)
    .order('sort_order');
  const lessonMaterials = (lessonMaterialRows || []).map((material: any) => ({
    ...material,
    url: `/api/materials/${material.id}/download`
  }));

  const { data: extraRows } = await admin
    .from('materials')
    .select('id,title,file_url,sort_order')
    .eq('course_id', course.id)
    .is('lesson_id', null)
    .eq('is_published', true)
    .order('sort_order');
  const extras = (extraRows || []).map((material: any) => ({
    ...material,
    url: `/api/materials/${material.id}/download`
  }));
  const { data: commentRows } = await admin
    .from('lesson_comments')
    .select('id,body,created_at,profile_id,parent_id,is_admin_reply')
    .eq('lesson_id', current.id)
    .order('created_at', { ascending: true });
  const commenterIds = Array.from(new Set((commentRows || []).map((comment: any) => comment.profile_id)));
  const { data: commenterProfiles } = commenterIds.length
    ? await admin.from('profiles').select('id,name').in('id', commenterIds)
    : { data: [] as any[] };
  const commenterNames = new Map((commenterProfiles || []).map((profile: any) => [profile.id, profile.name || 'Aluna']));
  const comments = (commentRows || []).map((comment: any) => ({
    ...comment,
    author: commenterNames.get(comment.profile_id) || 'Aluna'
  }));
  const rootComments = comments.filter((comment: any) => !comment.parent_id);
  const repliesByParent = new Map<string, any[]>();
  comments.filter((comment: any) => comment.parent_id).forEach((reply: any) => {
    const replies = repliesByParent.get(reply.parent_id) || [];
    replies.push(reply);
    repliesByParent.set(reply.parent_id, replies);
  });
  const commentsOpen = searchParams?.tab === 'comentarios';
  const lessonHref = `/area/${course.slug}?aula=${current.id}`;
  const initial = student.displayName.charAt(0).toUpperCase();

  return (
    <div className="ep-page">
      <header className="ep-bar">
        <Link className="ep-back" href="/area" aria-label="Voltar para meus cursos"><ArrowLeft size={16} /></Link>
        <img className="ep-logo" src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre" />
        <div className="ep-title"><small>{progress}% concluído · {lessons.length} aulas</small><h1>{current.title}</h1></div>
        <div className="ep-who"><span>Olá, {student.displayName}</span><span className="ep-avatar">{initial}</span></div>
      </header>

      <div className="ep-grid">
        <div>
          <div className="ep-video">
            {current.video_url ? <iframe src={current.video_url} title={current.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <button type="button" className="ep-play" aria-label="Aula sem vídeo"><Play size={28} fill="currentColor" /></button>}
          </div>
          <CourseTabs initiallyOpen={commentsOpen} informationHref={lessonHref} commentsHref={`${lessonHref}&tab=comentarios`} information={<p className="ep-desc">{current.description || course.description || course.subtitle || 'Curso sem descrição.'}</p>} comments={<section className="ep-comments">
            <div className="ep-comment-list">
              {rootComments.length ? rootComments.map((comment: any) => <article className="ep-comment" key={comment.id}>
                <strong>{comment.author}</strong>
                <time>{new Date(comment.created_at).toLocaleDateString('pt-BR')}</time>
                <p>{comment.body}</p>
                {(repliesByParent.get(comment.id) || []).map((reply: any) => <div className="ep-admin-reply" key={reply.id}>
                  <strong>Resposta da Suzana</strong>
                  <time>{new Date(reply.created_at).toLocaleDateString('pt-BR')}</time>
                  <p>{reply.body}</p>
                </div>)}
              </article>) : <p className="ep-empty-note">Ainda não há comentários nesta aula. Seja a primeira a comentar.</p>}
            </div>
            {course.comments_enabled ? <form action={addLessonComment} className="ep-comment-form">
              <input type="hidden" name="lessonId" value={current.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <textarea name="body" maxLength={1000} required placeholder="Escreva seu comentário ou sua dúvida..." />
              <button type="submit">Publicar comentário</button>
            </form> : <p className="ep-comments-disabled">Os comentários estão desativados neste curso.</p>}
          </section>} />
          <div className="ep-course-actions">
            <Link className={`ep-nav-button ${!previousLesson ? 'disabled' : ''}`} href={previousLesson ? `/area/${course.slug}?aula=${previousLesson.id}` : '#'} aria-disabled={!previousLesson}>Aula anterior</Link>
            <form action={toggleLessonProgress}>
              <input type="hidden" name="lessonId" value={current.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <button className={`ep-complete-button ${completedIds.has(current.id) ? 'completed' : ''}`} type="submit">{completedIds.has(current.id) ? 'Aula concluída' : 'Marcar como concluída'}</button>
            </form>
            <Link className={`ep-nav-button ${!nextLesson ? 'disabled' : ''}`} href={nextLesson ? `/area/${course.slug}?aula=${nextLesson.id}` : '#'} aria-disabled={!nextLesson}>Próxima aula</Link>
          </div>
          <div className="ep-materials"><h3>Materiais desta aula</h3>{lessonMaterials.length ? <div className="ep-mlist">{lessonMaterials.map((material: any) => <MaterialDownload href={material.url} title={material.title} key={material.id} />)}</div> : <p className="ep-empty-note">Nenhum material de apoio cadastrado para esta aula.</p>}</div>
        </div>

        <aside>
          <div className="ep-side-card"><div className="ep-side-head"><span className="ep-chk"><CheckCircle2 size={16} /></span>{course.title}</div><div className="ep-lessonlist">
            {lessons.map((lesson: any, index: number) => <Link className={`ep-li ${lesson.id === current.id ? 'current' : ''} ${completedIds.has(lesson.id) ? 'done' : ''}`} href={`/area/${course.slug}?aula=${lesson.id}`} key={lesson.id}><span className="ep-dot"><CheckCircle2 size={13} /></span><span>{index + 1}. {lesson.title}</span></Link>)}
          </div></div>
          {extras.length ? <div className="ep-side-card ep-materials-panel"><div className="ep-side-head"><span className="ep-chk"><Download size={16} /></span>Material Extra</div><div className="ep-mlist ep-mlist-panel">{extras.map((material: any) => <MaterialDownload href={material.url} title={material.title} key={material.id} />)}</div></div> : null}
        </aside>
      </div>

      <div className="ep-supportbar"><form action={logoutStudent}><button type="submit">Sair</button></form></div>
    </div>
  );
}

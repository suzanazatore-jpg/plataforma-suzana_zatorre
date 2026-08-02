import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Headphones,
  Maximize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume2
} from 'lucide-react';
import { supportUrl } from '@/lib/course';
import { getEvsLessonMaterials, getEvsLessons, getEvsMaterials } from '@/lib/supabase/data';
import { getCurrentStudent, hasActiveEnrollment } from '@/lib/supabase/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logoutStudent } from '@/app/actions/auth';
import { CourseTabs } from '@/app/area/course-tabs';
import { MaterialDownload } from '@/app/area/material-download';
import './evs.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function addLessonComment(formData: FormData) {
  'use server';
  const lessonId = String(formData.get('lessonId') || '');
  const body = String(formData.get('body') || '').trim();
  if (!UUID.test(lessonId) || !body || body.length > 1000) return;

  const supabase = (await import('@/lib/supabase/server')).createSupabaseServerClient();
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from('lesson_comments').insert({
    lesson_id: lessonId,
    profile_id: auth.user.id,
    body
  });
  revalidatePath('/area/evs');
}

async function toggleLessonProgress(formData: FormData) {
  'use server';
  const lessonId = String(formData.get('lessonId') || '');
  if (!UUID.test(lessonId)) return;

  const supabase = (await import('@/lib/supabase/server')).createSupabaseServerClient();
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
  revalidatePath('/area/evs');
}

export default async function EvsCoursePage({ searchParams }: { searchParams?: { aula?: string; tab?: string } }) {
  const student = await getCurrentStudent();
  if (!student) {
    redirect('/?erro=login');
  }

  const isAdmin = student.profile?.role === 'admin' && student.profile.status === 'active';
  if (!isAdmin) {
    const enrolled = await hasActiveEnrollment('evs');
    if (!enrolled) {
      redirect('/acesso-negado');
    }
  }

  const lessons: any[] = await getEvsLessons();
  const bonuses = await getEvsMaterials();
  const supabase = (await import('@/lib/supabase/server')).createSupabaseServerClient();
  const lessonIds = lessons.map((lesson: any) => lesson.dbId).filter(Boolean);
  const { data: progressRows } = supabase && lessonIds.length
    ? await supabase.from('lesson_progress').select('lesson_id, completed, updated_at').eq('profile_id', student.userId).in('lesson_id', lessonIds).order('updated_at', { ascending: false })
    : { data: [] as any[] };
  const completedIds = new Set((progressRows || []).filter((row: any) => row.completed).map((row: any) => row.lesson_id));
  const completed = completedIds.size;
  const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const lastLessonId = progressRows?.[0]?.lesson_id;
  const currentLesson = lessons.find((lesson: any) => lesson.id === searchParams?.aula)
    || lessons.find((lesson: any) => lesson.dbId === lastLessonId)
    || lessons[0];
  if (!currentLesson) redirect('/area');
  const currentIndex = lessons.findIndex((lesson: any) => lesson.id === currentLesson.id);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const currentCompleted = currentLesson.dbId ? completedIds.has(currentLesson.dbId) : false;
  const lessonMaterials = await getEvsLessonMaterials(currentLesson.id);
  const admin = createSupabaseAdminClient();
  const { data: courseSettings } = admin
    ? await admin.from('courses').select('comments_enabled').eq('slug', 'evs').maybeSingle()
    : { data: null };
  const { data: commentRows } = admin && currentLesson.dbId
    ? await admin.from('lesson_comments').select('id,body,created_at,profile_id,parent_id,is_admin_reply').eq('lesson_id', currentLesson.dbId).order('created_at', { ascending: true })
    : { data: [] as any[] };
  const commenterIds = Array.from(new Set((commentRows || []).map((comment: any) => comment.profile_id)));
  const { data: commenterProfiles } = admin && commenterIds.length
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
  const lessonHref = `/area/evs?aula=${currentLesson.id}`;
  const initial = student.displayName.charAt(0).toUpperCase();
  const hasRealVideo = Boolean(currentLesson.videoUrl && currentLesson.videoUrl !== '#');

  return (
    <div className="ep-page">
      <header className="ep-bar">
        <Link className="ep-back" href="/area" aria-label="Voltar para meus cursos">
          <ArrowLeft size={16} />
        </Link>
        <img className="ep-logo" src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre" />
        <div className="ep-title">
          <small>{progress}% concluído · {lessons.length} aulas</small>
          <h1>{currentLesson.title}</h1>
        </div>
        <div className="ep-who">
          <span className="ep-dashes">
            {lessons.map((_, i) => (
              <i key={i} className={i === currentIndex ? 'on' : ''} />
            ))}
          </span>
          <span>Olá, {student.displayName}</span>
          <span className="ep-avatar">{initial}</span>
        </div>
      </header>

      <div className="ep-grid">
        <div>
          <div className="ep-video">
            {hasRealVideo ? (
              <iframe
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <span className="ep-presenter">
                  <span className="ep-presenter-mark">↗</span> Suzana Zatorre
                </span>
                <button type="button" className="ep-play" aria-label="Assistir aula">
                  <Play size={28} fill="currentColor" />
                </button>
                <div className="ep-vctrl-overlay">
                  <div className="ep-vctrl-row">
                    <SkipBack size={16} />
                    <Play size={16} />
                    <SkipForward size={16} />
                    <div className="ep-vctrl-bar">
                      <i style={{ width: '4%' }} />
                    </div>
                    <span className="ep-vctrl-time">00:00 / 00:00</span>
                    <Volume2 size={16} />
                    <div className="ep-vctrl-vol">
                      <i style={{ width: '70%' }} />
                    </div>
                    <Settings size={16} />
                    <Maximize size={16} />
                  </div>
                </div>
              </>
            )}
          </div>

          <CourseTabs
            initiallyOpen={commentsOpen}
            informationHref={lessonHref}
            commentsHref={`${lessonHref}&tab=comentarios`}
            information={<p className="ep-desc">{currentLesson.description}</p>}
            comments={<section className="ep-comments">
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
            {currentLesson.dbId && courseSettings?.comments_enabled !== false ? <form action={addLessonComment} className="ep-comment-form">
              <input type="hidden" name="lessonId" value={currentLesson.dbId} />
              <textarea name="body" maxLength={1000} required placeholder="Escreva seu comentário ou sua dúvida..." />
              <button type="submit">Publicar comentário</button>
            </form> : <p className="ep-comments-disabled">Os comentários estão desativados neste curso.</p>}
          </section>}
          />

          <div className="ep-course-actions">
            <Link className={`ep-nav-button ${!previousLesson ? 'disabled' : ''}`} href={previousLesson ? `/area/evs?aula=${previousLesson.id}` : '#'} aria-disabled={!previousLesson}>
              Aula anterior
            </Link>
            {currentLesson.dbId ? (
              <form action={toggleLessonProgress}>
                <input type="hidden" name="lessonId" value={currentLesson.dbId} />
                <button className={`ep-complete-button ${currentCompleted ? 'completed' : ''}`} type="submit">
                  {currentCompleted ? 'Aula concluída' : 'Marcar como concluída'}
                </button>
              </form>
            ) : null}
            <Link className={`ep-nav-button ${!nextLesson ? 'disabled' : ''}`} href={nextLesson ? `/area/evs?aula=${nextLesson.id}` : '#'} aria-disabled={!nextLesson}>
              Próxima aula
            </Link>
          </div>

          <div className="ep-materials">
            <h3>Materiais desta aula</h3>
            {lessonMaterials.length ? (
              <div className="ep-mlist">
                {lessonMaterials.map((material) => (
                  <MaterialDownload href={material.url} title={material.title} key={material.id || material.title} />
                ))}
              </div>
            ) : (
              <p className="ep-empty-note">Nenhum material de apoio cadastrado para esta aula.</p>
            )}
          </div>
        </div>

        <aside>
          <div className="ep-side-card">
            <div className="ep-side-head">
              <span className="ep-chk">
                <CheckCircle2 size={16} />
              </span>
              EVS — Equipe que Vende Sozinha
            </div>
            <div className="ep-lessonlist">
              {lessons.map((lesson: any, index) => (
                <Link className={`ep-li ${index === currentIndex ? 'current' : ''} ${completedIds.has(lesson.dbId) ? 'done' : ''}`} href={`/area/evs?aula=${lesson.id}`} key={lesson.id}>
                  <span className="ep-dot">
                    <CheckCircle2 size={13} />
                  </span>
                  <span>
                    {index + 1}. {lesson.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {bonuses.length ? (
            <div className="ep-side-card ep-materials-panel">
              <div className="ep-side-head">
                <span className="ep-chk">
                  <Download size={16} />
                </span>
                Material Extra
              </div>
              <div className="ep-mlist ep-mlist-panel">
                {bonuses.map((bonus) => (
                  <MaterialDownload href={bonus.url} title={bonus.title} key={bonus.title} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="ep-notes">
            <div className="ep-notes-head">Anotações</div>
            <textarea placeholder="Escreva suas anotações aqui" />
            <div className="ep-notes-foot">
              <span />
              <button type="button">Salvar</button>
            </div>
          </div>
        </aside>
      </div>

      <div className="ep-supportbar">
        <a href={supportUrl} target="_blank" rel="noopener noreferrer">
          <Headphones size={15} /> Dúvidas sobre esta aula? Fale com o suporte
        </a>
        <form action={logoutStudent}>
          <button type="submit">Sair</button>
        </form>
      </div>
    </div>
  );
}

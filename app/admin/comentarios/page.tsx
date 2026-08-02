import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DeleteCommentButton } from './comment-actions';
import './comentarios.css';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAdmin() {
  const session = createSupabaseServerClient();
  const db = createSupabaseAdminClient();
  if (!session || !db) return null;
  const { data } = await session.auth.getUser();
  if (!data.user?.id) return null;
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin' && profile.status === 'active' ? { db, adminId: data.user.id } : null;
}

async function replyComment(formData: FormData) {
  'use server';
  const admin = await getAdmin();
  if (!admin) return;
  const commentId = String(formData.get('commentId') || '');
  const body = String(formData.get('body') || '').trim();
  if (!UUID.test(commentId) || !body || body.length > 1000) return;

  const { data: original } = await admin.db
    .from('lesson_comments')
    .select('id,lesson_id,parent_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!original || original.parent_id) return;

  const { error } = await admin.db.from('lesson_comments').insert({
    lesson_id: original.lesson_id,
    profile_id: admin.adminId,
    parent_id: original.id,
    is_admin_reply: true,
    body
  });
  if (error) throw new Error('Não foi possível publicar a resposta.');
  revalidatePath('/admin/comentarios');
  revalidatePath('/area', 'layout');
}

async function deleteComment(formData: FormData) {
  'use server';
  const admin = await getAdmin();
  if (!admin) return;
  const commentId = String(formData.get('commentId') || '');
  if (!UUID.test(commentId)) return;
  const { error } = await admin.db.from('lesson_comments').delete().eq('id', commentId);
  if (error) throw new Error('Não foi possível apagar a mensagem.');
  revalidatePath('/admin/comentarios');
  revalidatePath('/area', 'layout');
}

async function toggleCourseComments(formData: FormData) {
  'use server';
  const admin = await getAdmin();
  if (!admin) return;
  const courseId = String(formData.get('courseId') || '');
  const enabled = String(formData.get('enabled') || '') === 'true';
  if (!UUID.test(courseId)) return;
  const { error } = await admin.db.from('courses').update({ comments_enabled: enabled }).eq('id', courseId);
  if (error) throw new Error('Não foi possível alterar a configuração dos comentários.');
  revalidatePath('/admin/comentarios');
  revalidatePath('/area', 'layout');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza'
  }).format(new Date(value));
}

export default async function CommentsAdminPage({ searchParams }: { searchParams?: { curso?: string; status?: string } }) {
  const admin = await getAdmin();
  if (!admin) redirect('/area');
  const db = admin.db;

  const [coursesResult, lessonsResult, profilesResult, commentsResult] = await Promise.all([
    db.from('courses').select('id,slug,title,comments_enabled').order('sort_order'),
    db.from('lessons').select('id,title,course_id'),
    db.from('profiles').select('id,name,email'),
    db.from('lesson_comments').select('id,lesson_id,profile_id,parent_id,is_admin_reply,body,created_at').order('created_at', { ascending: false })
  ]);
  const hasError = coursesResult.error || lessonsResult.error || profilesResult.error || commentsResult.error;
  const courses = coursesResult.data || [];
  const lessons = lessonsResult.data || [];
  const profiles = profilesResult.data || [];
  const allComments = commentsResult.data || [];
  const courseMap = new Map(courses.map((course: any) => [course.id, course]));
  const lessonMap = new Map(lessons.map((lesson: any) => [lesson.id, lesson]));
  const profileMap = new Map(profiles.map((profile: any) => [profile.id, profile]));
  const repliesByParent = new Map<string, any[]>();
  allComments.filter((comment: any) => comment.parent_id).forEach((reply: any) => {
    const replies = repliesByParent.get(reply.parent_id) || [];
    replies.push(reply);
    repliesByParent.set(reply.parent_id, replies);
  });
  let comments = allComments.filter((comment: any) => !comment.parent_id);
  if (searchParams?.curso) comments = comments.filter((comment: any) => lessonMap.get(comment.lesson_id)?.course_id === searchParams.curso);
  if (searchParams?.status === 'respondidos') comments = comments.filter((comment: any) => (repliesByParent.get(comment.id) || []).length > 0);
  if (searchParams?.status === 'pendentes') comments = comments.filter((comment: any) => (repliesByParent.get(comment.id) || []).length === 0);
  const pendingCount = allComments.filter((comment: any) => !comment.parent_id && !(repliesByParent.get(comment.id) || []).length).length;

  return <>
    <div className="crumb">⚙ Administrador › Comentários</div>
    <div className="pad">
      <div className="comments-head">
        <div><h1>Comentários</h1><p>Responda às alunas, apague mensagens e escolha em quais cursos os comentários ficam ativos.</p></div>
        <div className="comments-count"><strong>{pendingCount}</strong>{pendingCount === 1 ? 'mensagem sem resposta' : 'mensagens sem resposta'}</div>
      </div>

      <section className="comments-section">
        <h2>Configuração por curso</h2>
        <p>Ao desativar, os comentários já publicados continuam guardados, mas novas mensagens ficam bloqueadas.</p>
        <div className="course-settings">
          {courses.map((course: any) => <div className="course-setting" key={course.id}>
            <div><strong>{course.title}</strong><small>{course.comments_enabled ? 'Alunas podem comentar' : 'Novos comentários bloqueados'}</small></div>
            <form action={toggleCourseComments}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="enabled" value={String(!course.comments_enabled)} />
              <button className={`course-toggle ${course.comments_enabled ? 'on' : ''}`} type="submit">{course.comments_enabled ? 'Ativado' : 'Desativado'}</button>
            </form>
          </div>)}
        </div>
      </section>

      <section className="comments-section">
        <h2>Mensagens das alunas</h2>
        <p>Filtre por curso ou veja apenas o que ainda precisa de resposta.</p>
        <form className="comments-filter" method="get">
          <select name="curso" defaultValue={searchParams?.curso || ''}><option value="">Todos os cursos</option>{courses.map((course: any) => <option value={course.id} key={course.id}>{course.title}</option>)}</select>
          <select name="status" defaultValue={searchParams?.status || ''}><option value="">Todas as mensagens</option><option value="pendentes">Sem resposta</option><option value="respondidos">Respondidas</option></select>
          <button type="submit">Filtrar</button>
        </form>
        {hasError ? <div className="comment-error">Não foi possível carregar os comentários.</div> :
        <div className="comment-list">
          {comments.length === 0 ? <div className="comment-empty"><MessageSquare size={28} /><p>Nenhuma mensagem encontrada.</p></div> : comments.map((comment: any) => {
            const profile = profileMap.get(comment.profile_id);
            const lesson = lessonMap.get(comment.lesson_id);
            const course = lesson ? courseMap.get(lesson.course_id) : null;
            const replies = (repliesByParent.get(comment.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
            return <article className="comment-card" key={comment.id}>
              <div className="comment-meta"><div><strong>{profile?.name || 'Aluna'}</strong><small>{profile?.email || 'E-mail não informado'}</small><div className="comment-path">{course?.title || 'Curso'} › {lesson?.title || 'Aula'}</div></div><small>{formatDate(comment.created_at)}</small></div>
              <p className="comment-body">{comment.body}</p>
              {replies.length ? <div className="admin-replies">{replies.map((reply: any) => <div className="admin-reply" key={reply.id}><header><strong>Resposta da Suzana</strong><span>{formatDate(reply.created_at)}</span></header><p>{reply.body}</p><DeleteCommentButton commentId={reply.id} deleteComment={deleteComment} label="Apagar resposta" /></div>)}</div> : null}
              <div className="comment-actions">
                <form className="comment-reply-form" action={replyComment}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <textarea name="body" required maxLength={1000} placeholder={replies.length ? 'Enviar outra resposta...' : 'Escreva sua resposta para a aluna...'} />
                  <button type="submit"><Send size={14} /> Responder</button>
                </form>
                <DeleteCommentButton commentId={comment.id} deleteComment={deleteComment} />
              </div>
            </article>;
          })}
        </div>}
      </section>
    </div>
  </>;
}

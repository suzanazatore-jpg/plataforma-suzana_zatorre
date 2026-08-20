import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, CheckCircle2, Download, Play, Send } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentStudent } from '@/lib/supabase/session';
import { MaterialDownload } from '@/app/area/material-download';
import { LessonDescription } from '@/app/area/lesson-description';
import '@/app/area/evs/evs.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function addLessonComment(formData: FormData) {
  'use server';
  const lessonId = String(formData.get('lessonId') || '');
  const courseSlug = String(formData.get('courseSlug') || '');
  const lessonTitle = String(formData.get('lessonTitle') || '');
  const courseTitle = String(formData.get('courseTitle') || '');
  const body = String(formData.get('body') || '').trim();
  if (!UUID.test(lessonId) || !courseSlug || !body || body.length > 1000) return;

  const supabase = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data: lesson } = await admin
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return;

  const { data: profile } = await admin
    .from('profiles')
    .select('name, email, phone, role, status')
    .eq('id', auth.user.id)
    .maybeSingle();

  // Só quem tem acesso ativo ao curso (ou a admin) pode enviar pergunta.
  const isActiveAdmin = profile?.role === 'admin' && profile.status === 'active';
  if (!isActiveAdmin) {
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('profile_id', auth.user.id)
      .eq('course_id', lesson.course_id)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    if (!enrollment) return;
  }

  // 1) Registra a pergunta (fica visível só pra aluna que perguntou e pra admin).
  await admin.from('lesson_comments').insert({
    lesson_id: lessonId,
    profile_id: auth.user.id,
    body
  });

  // 2) Dispara pro Botconversa -> WhatsApp da Suzana. Best-effort: se falhar
  //    ou a variável não estiver configurada, a pergunta já ficou salva.
  const webhook = process.env.BOTCONVERSA_WEBHOOK_URL?.trim();
  if (!webhook) {
    await admin.from('integration_logs').insert({
      kind: 'botconversa',
      ok: false,
      status: null,
      detail: 'BOTCONVERSA_WEBHOOK_URL nao configurada no ambiente'
    });
  } else {
    // Botconversa (acao "Telefone WhatsApp") ja adiciona o 55 na frente.
    // Por isso enviamos o numero SEM o 55, senao ele fica duplicado (55 + 55...)
    // e o disparo falha com erro 400. Removemos o 55 apenas quando ele e o
    // codigo do pais (numero com 12+ digitos), preservando DDDs que comecam
    // com 55 em numeros ja sem codigo do pais.
    const digitsOnly = (profile?.phone || '').replace(/\D/g, '');
    const phoneForBot = digitsOnly.length >= 12 && digitsOnly.startsWith('55')
      ? digitsOnly.slice(2)
      : digitsOnly;

    try {
      const resposta = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: profile?.name || 'Aluna',
          email: profile?.email || '',
          telefone: phoneForBot,
          curso: courseTitle,
          aula: lessonTitle,
          pergunta: body,
          mensagem: body
        })
      });
      const corpo = await resposta.text().catch(() => '');
      await admin.from('integration_logs').insert({
        kind: 'botconversa',
        ok: resposta.ok,
        status: resposta.status,
        detail: corpo.slice(0, 500)
      });
    } catch (erro: any) {
      await admin.from('integration_logs').insert({
        kind: 'botconversa',
        ok: false,
        status: null,
        detail: String(erro?.message || erro).slice(0, 500)
      });
    }
  }

  revalidatePath(`/area/${courseSlug}`);
  redirect(`/area/${courseSlug}?aula=${lessonId}&tab=comentarios&enviado=1`);
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
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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
  searchParams?: { aula?: string; tab?: string; enviado?: string };
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
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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
  // Privacidade: admin vê todas as perguntas; a aluna vê só as dela; ninguém vê as das outras.
  const visibleRoots = isAdmin
    ? rootComments
    : rootComments.filter((comment: any) => comment.profile_id === student.userId);
  const enviado = searchParams?.enviado === '1';
  const activeTab = searchParams?.tab === 'comentarios' ? 'comentarios' : 'descricao';
  const initial = student.displayName.charAt(0).toUpperCase();

  const commentsPanel = (
    <section style={{ padding: '4px 0 2px' }}>
      {enviado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(37,211,102,.12)', color: '#8fe3aa', border: '1px solid rgba(37,211,102,.32)', borderRadius: 12, padding: '11px 14px', fontSize: 14, marginBottom: 16 }}>
          <CheckCircle2 size={16} /> Pergunta enviada! A Suzana responde no seu WhatsApp.
        </div>
      )}

      {visibleRoots.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: isAdmin ? 2 : 18 }}>
          {visibleRoots.map((comment: any) => (
            <article key={comment.id} style={{ background: '#17171b', border: '1px solid #26262b', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 10 }}>
                <strong style={{ color: '#f2f2f4', fontSize: 14 }}>{isAdmin ? comment.author : 'Sua pergunta'}</strong>
                <time style={{ color: '#7a7a80', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(comment.created_at).toLocaleDateString('pt-BR')}</time>
              </div>
              <p style={{ color: '#c9c9cf', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{comment.body}</p>
              {(repliesByParent.get(comment.id) || []).map((reply: any) => (
                <div key={reply.id} style={{ marginTop: 12, paddingLeft: 14, borderLeft: '2px solid #ff2e63' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 10 }}>
                    <strong style={{ color: '#ff6b93', fontSize: 13 }}>Resposta da Suzana</strong>
                    <time style={{ color: '#7a7a80', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(reply.created_at).toLocaleDateString('pt-BR')}</time>
                  </div>
                  <p style={{ color: '#c9c9cf', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{reply.body}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div style={{ minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 12px' }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#3a3a42" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <p style={{ color: '#c9c9cf', fontSize: 15, fontWeight: 500, margin: '12px 0 4px' }}>
            {isAdmin ? 'Nenhuma pergunta nesta aula ainda.' : 'Ficou com dúvida nesta aula?'}
          </p>
          <p style={{ color: '#8a8a90', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {isAdmin ? 'As perguntas das alunas aparecem aqui. Você também pode escrever abaixo.' : 'Escreva abaixo. Sua pergunta vai direto pro WhatsApp da Suzana.'}
          </p>
        </div>
      )}

      <form action={addLessonComment} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, borderTop: '1px solid #26262b', paddingTop: 14, marginTop: 4 }}>
        <input type="hidden" name="lessonId" value={current.id} />
        <input type="hidden" name="courseSlug" value={course.slug} />
        <input type="hidden" name="lessonTitle" value={current.title} />
        <input type="hidden" name="courseTitle" value={course.title} />
        <textarea name="body" maxLength={1000} required rows={1} placeholder="escreva sua pergunta..." style={{ flex: 1, resize: 'none', background: '#1a1a1e', border: '1px solid #2c2c33', borderRadius: 20, color: '#f2f2f4', fontSize: 14, padding: '11px 16px', fontFamily: 'inherit', lineHeight: 1.5 }} />
        <button type="submit" aria-label="Enviar pergunta" style={{ width: 44, height: 44, flex: '0 0 auto', border: 0, borderRadius: '50%', background: '#ff2e63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Send size={18} />
        </button>
      </form>
    </section>
  );

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
          <section style={{ marginTop: 20 }}>
            <div role="tablist" aria-label="Conteúdo da aula" style={{ display: 'flex', gap: 26, borderBottom: '1px solid #26262b', margin: '0 0 16px' }}>
              <Link
                href={`/area/${course.slug}?aula=${current.id}`}
                role="tab"
                aria-selected={activeTab === 'descricao'}
                style={{ padding: '0 0 11px', fontWeight: 800, fontSize: 14, textDecoration: 'none', color: activeTab === 'descricao' ? '#ff2e63' : '#7a7a80', borderBottom: activeTab === 'descricao' ? '2px solid #ff2e63' : '2px solid transparent' }}
              >
                Descrição
              </Link>
              <Link
                href={`/area/${course.slug}?aula=${current.id}&tab=comentarios`}
                role="tab"
                aria-selected={activeTab === 'comentarios'}
                style={{ padding: '0 0 11px', fontWeight: 800, fontSize: 14, textDecoration: 'none', color: activeTab === 'comentarios' ? '#ff2e63' : '#7a7a80', borderBottom: activeTab === 'comentarios' ? '2px solid #ff2e63' : '2px solid transparent' }}
              >
                Comentários
              </Link>
            </div>
            <div role="tabpanel">
              {activeTab === 'comentarios' ? commentsPanel : <LessonDescription text={current.description} />}
            </div>
          </section>
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
          <div className="ep-side-card">
            <div className="ep-side-head"><span className="ep-chk"><CheckCircle2 size={16} /></span>{course.title}</div>
            <div className="ep-module-list">
              {(modules || []).map((module: any) => {
                const publishedLessons = (module.lessons || []).filter((lesson: any) => lesson.is_published);
                if (!publishedLessons.length) return null;
                return <section className="ep-module" key={module.id}>
                  <h3 className="ep-module-head">{module.title}</h3>
                  <div className="ep-lessonlist">
                    {publishedLessons.map((lesson: any) => {
                      const lessonIndex = lessons.findIndex((item: any) => item.id === lesson.id);
                      return <Link className={`ep-li ${lesson.id === current.id ? 'current' : ''} ${completedIds.has(lesson.id) ? 'done' : ''}`} href={`/area/${course.slug}?aula=${lesson.id}`} key={lesson.id}><span className="ep-dot"><CheckCircle2 size={13} /></span><span>{lessonIndex + 1}. {lesson.title}</span></Link>;
                    })}
                  </div>
                </section>;
              })}
            </div>
          </div>
          {extras.length ? <div className="ep-side-card ep-materials-panel"><div className="ep-side-head"><span className="ep-chk"><Download size={16} /></span>Material Extra</div><div className="ep-mlist ep-mlist-panel">{extras.map((material: any) => <MaterialDownload href={material.url} title={material.title} key={material.id} />)}</div></div> : null}
        </aside>
      </div>

    </div>
  );
}

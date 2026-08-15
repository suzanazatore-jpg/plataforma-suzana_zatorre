import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Archive, ArchiveRestore, MessageSquare, Send, Trash2 } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import '../usuarios/usuarios.css';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function validarAdmin() {
  const sessao = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!sessao || !admin) return null;
  const { data } = await sessao.auth.getUser();
  if (!data.user?.id) return null;
  const { data: perfil } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .maybeSingle();
  if (perfil?.role !== 'admin' || perfil.status !== 'active') return null;
  return { admin, adminId: data.user.id };
}

async function responderComentario(formData: FormData) {
  'use server';
  const parentId = String(formData.get('parentId') || '');
  const body = String(formData.get('body') || '').trim();
  if (!UUID.test(parentId) || !body || body.length > 2000) return;
  const ctx = await validarAdmin();
  if (!ctx) return;
  const { data: parent } = await ctx.admin
    .from('lesson_comments')
    .select('lesson_id')
    .eq('id', parentId)
    .maybeSingle();
  if (!parent) return;
  await ctx.admin.from('lesson_comments').insert({
    lesson_id: parent.lesson_id,
    profile_id: ctx.adminId,
    parent_id: parentId,
    is_admin_reply: true,
    body
  });
  revalidatePath('/admin/comentarios');
}

async function arquivarComentario(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const arquivar = String(formData.get('arquivar') || '1') === '1';
  if (!UUID.test(id)) return;
  const ctx = await validarAdmin();
  if (!ctx) return;
  await ctx.admin
    .from('lesson_comments')
    .update({ archived: arquivar, archived_at: arquivar ? new Date().toISOString() : null })
    .eq('id', id);
  revalidatePath('/admin/comentarios');
}

async function removerComentario(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!UUID.test(id)) return;
  const ctx = await validarAdmin();
  if (!ctx) return;
  // Apaga a pergunta e as respostas ligadas a ela.
  await ctx.admin.from('lesson_comments').delete().or(`id.eq.${id},parent_id.eq.${id}`);
  revalidatePath('/admin/comentarios');
}

function iniciais(nome: string) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function formatarData(data?: string | null) {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(data));
}

const abas: { chave: string; rotulo: string }[] = [
  { chave: 'novas', rotulo: 'Novas' },
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'arquivadas', rotulo: 'Arquivadas' }
];

export default async function ComentariosAdminPage({
  searchParams
}: {
  searchParams?: { tab?: string; limit?: string; remover?: string };
}) {
  const ctx = await validarAdmin();
  if (!ctx) redirect('/acesso-negado');
  const admin = ctx.admin;

  const tab = searchParams?.tab === 'todas' || searchParams?.tab === 'arquivadas' ? searchParams.tab : 'novas';
  const limite = Math.min(Math.max(parseInt(searchParams?.limit || '30', 10) || 30, 30), 300);
  const removerId = searchParams?.remover && UUID.test(searchParams.remover) ? searchParams.remover : null;
  const arquivada = tab === 'arquivadas';

  const { data: rootsRaw } = await admin
    .from('lesson_comments')
    .select('id, body, created_at, profile_id, lesson_id, archived')
    .is('parent_id', null)
    .eq('is_admin_reply', false)
    .eq('archived', arquivada)
    .order('created_at', { ascending: false })
    .limit(limite + 1);
  const temMais = (rootsRaw || []).length > limite;
  const roots = (rootsRaw || []).slice(0, limite);

  const rootIds = roots.map((item: any) => item.id);
  const { data: repliesRaw } = rootIds.length
    ? await admin
        .from('lesson_comments')
        .select('id, body, created_at, parent_id')
        .in('parent_id', rootIds)
        .order('created_at', { ascending: true })
    : { data: [] as any[] };
  const repliesByParent = new Map<string, any[]>();
  (repliesRaw || []).forEach((reply: any) => {
    const lista = repliesByParent.get(reply.parent_id) || [];
    lista.push(reply);
    repliesByParent.set(reply.parent_id, lista);
  });

  const profileIds = Array.from(new Set(roots.map((item: any) => item.profile_id)));
  const { data: profs } = profileIds.length
    ? await admin.from('profiles').select('id, name').in('id', profileIds)
    : { data: [] as any[] };
  const nomes = new Map((profs || []).map((p: any) => [p.id, p.name || 'Aluna']));

  const lessonIds = Array.from(new Set(roots.map((item: any) => item.lesson_id).filter(Boolean)));
  const { data: lessonsRaw } = lessonIds.length
    ? await admin.from('lessons').select('id, title, module_id, course_id').in('id', lessonIds)
    : { data: [] as any[] };
  const lessonsMap = new Map((lessonsRaw || []).map((l: any) => [l.id, l]));
  const moduleIds = Array.from(new Set((lessonsRaw || []).map((l: any) => l.module_id).filter(Boolean)));
  const courseIds = Array.from(new Set((lessonsRaw || []).map((l: any) => l.course_id).filter(Boolean)));
  const { data: modsRaw } = moduleIds.length
    ? await admin.from('modules').select('id, title').in('id', moduleIds)
    : { data: [] as any[] };
  const { data: coursesRaw } = courseIds.length
    ? await admin.from('courses').select('id, title').in('id', courseIds)
    : { data: [] as any[] };
  const modsMap = new Map((modsRaw || []).map((m: any) => [m.id, m.title]));
  const coursesMap = new Map((coursesRaw || []).map((c: any) => [c.id, c.title]));

  let cards = roots.map((item: any) => {
    const lesson = lessonsMap.get(item.lesson_id) as any;
    const trilha = [
      lesson ? coursesMap.get(lesson.course_id) : null,
      lesson ? modsMap.get(lesson.module_id) : null,
      lesson?.title
    ].filter(Boolean).join(' · ');
    return {
      ...item,
      author: nomes.get(item.profile_id) || 'Aluna',
      replies: repliesByParent.get(item.id) || [],
      trilha: trilha || 'Aula'
    };
  });
  if (tab === 'novas') cards = cards.filter((card: any) => card.replies.length === 0);

  const linkAba = (chave: string) => `/admin/comentarios?tab=${chave}`;

  return (
    <>
      <div className="crumb">⚙ Administrador › Comentários</div>
      <div className="pad">
        <div className="blk-title">Comentários</div>
        <p className="blk-sub">Veja e responda as perguntas das alunas. Sua resposta aparece pra aluna embaixo da pergunta dela.</p>

        <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #26262b', margin: '18px 0 20px' }}>
          {abas.map((aba) => {
            const ativa = aba.chave === tab;
            return (
              <Link key={aba.chave} href={linkAba(aba.chave)} style={{ color: ativa ? '#ff2e63' : '#8a8a90', fontSize: 14, fontWeight: ativa ? 600 : 400, textDecoration: 'none', paddingBottom: 10, borderBottom: ativa ? '2px solid #ff2e63' : '2px solid transparent' }}>
                {aba.rotulo}
              </Link>
            );
          })}
        </div>

        {cards.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 12px', color: '#8a8a90' }}>
            <MessageSquare size={40} style={{ opacity: 0.3 }} />
            <p style={{ marginTop: 12, fontSize: 15, color: '#c9c9cf' }}>
              {tab === 'novas' ? 'Nenhuma pergunta nova por enquanto.' : tab === 'arquivadas' ? 'Nenhuma pergunta arquivada.' : 'Nenhuma pergunta ainda.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cards.map((card: any) => {
              const nova = card.replies.length === 0 && !card.archived;
              return (
                <div key={card.id} style={{ background: '#17171b', border: '1px solid #26262b', borderLeft: nova ? '3px solid #ff2e63' : '1px solid #26262b', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#2a2a30', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#cfcfd4' }}>{iniciais(card.author)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {card.author}
                        {nova && <span style={{ background: 'rgba(255,46,99,.15)', color: '#ff6b93', fontSize: 11, padding: '2px 7px', borderRadius: 10, marginLeft: 6 }}>Nova</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#7a7a80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.trilha} · {formatarData(card.created_at)}</div>
                    </div>
                    <span style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                      <form action={arquivarComentario}>
                        <input type="hidden" name="id" value={card.id} />
                        <input type="hidden" name="arquivar" value={card.archived ? '0' : '1'} />
                        <button type="submit" title={card.archived ? 'Desarquivar' : 'Arquivar'} aria-label={card.archived ? 'Desarquivar' : 'Arquivar'} style={{ background: 'transparent', border: 0, color: '#8a8a90', cursor: 'pointer', padding: 4, display: 'flex' }}>
                          {card.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                        </button>
                      </form>
                      <Link href={`/admin/comentarios?tab=${tab}&limit=${limite}&remover=${card.id}`} title="Remover" aria-label="Remover" style={{ color: '#8a8a90', padding: 4, display: 'flex' }}>
                        <Trash2 size={18} />
                      </Link>
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: 14, color: '#d4d4d8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{card.body}</p>

                  {card.replies.map((reply: any) => (
                    <div key={reply.id} style={{ margin: '0 0 10px', paddingLeft: 14, borderLeft: '2px solid #ff2e63' }}>
                      <div style={{ fontSize: 13, color: '#ff6b93', fontWeight: 600, marginBottom: 3 }}>Resposta da Suzana · {formatarData(reply.created_at)}</div>
                      <p style={{ margin: 0, fontSize: 14, color: '#c9c9cf', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply.body}</p>
                    </div>
                  ))}

                  {removerId === card.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,46,99,.08)', border: '1px solid rgba(255,46,99,.3)', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#f2b8c6' }}>Remover esta pergunta{card.replies.length ? ' e a resposta' : ''}? Não dá pra desfazer.</span>
                      <form action={removerComentario}>
                        <input type="hidden" name="id" value={card.id} />
                        <button type="submit" style={{ background: '#ff2e63', color: '#fff', border: 0, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Remover</button>
                      </form>
                      <Link href={`/admin/comentarios?tab=${tab}&limit=${limite}`} style={{ color: '#9a9aa0', fontSize: 13, textDecoration: 'none', padding: '7px 10px' }}>Cancelar</Link>
                    </div>
                  ) : (
                    <form action={responderComentario} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111113', border: '1px solid #2c2c33', borderRadius: 22, padding: '4px 6px 4px 14px', marginTop: 4 }}>
                      <input type="hidden" name="parentId" value={card.id} />
                      <input name="body" required maxLength={2000} autoComplete="off" placeholder="Responder pela plataforma..." style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#f2f2f4', fontSize: 13, padding: '8px 0' }} />
                      <button type="submit" aria-label="Enviar resposta" style={{ width: 34, height: 34, flex: '0 0 auto', border: 0, borderRadius: '50%', background: '#ff2e63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Send size={16} />
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {temMais && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <Link href={`/admin/comentarios?tab=${tab}&limit=${limite + 30}`} style={{ display: 'inline-block', background: '#ff2e63', color: '#fff', fontSize: 13, fontWeight: 500, padding: '9px 22px', borderRadius: 22, textDecoration: 'none' }}>Carregar mais</Link>
          </div>
        )}
      </div>
    </>
  );
}

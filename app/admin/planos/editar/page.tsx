import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlanoDados, VincularCursoButton, DesvincularCursoButton } from '../plan-editor';
import '../planos.css';
import './editar.css';

export const dynamic = 'force-dynamic';
type Resultado = { ok: boolean; mensagem: string; id?: string };

async function admin() {
  const sessao = createSupabaseServerClient(); const db = createSupabaseAdminClient();
  if (!sessao || !db) return null;
  const { data } = await sessao.auth.getUser(); if (!data.user) return null;
  const { data: p } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  return p?.role === 'admin' && p.status === 'active' ? db : null;
}

function parsePreco(s: string): number | null {
  const t = (s || '').trim(); if (!t) return null;
  const limpo = t.replace(/[^\d.,]/g, '');
  const norm = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(norm);
  return Number.isNaN(n) ? null : n;
}

async function salvarPlano(d: { id: string; nome: string; offerId: string; periodDias: number; preco: string; linkVenda: string }): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode editar planos.' };
  const name = d.nome.trim(); const offer_id = d.offerId.trim();
  if (!name || !offer_id) return { ok: false, mensagem: 'Confira o nome e o ID da oferta.' };
  const period_days = Number.isFinite(d.periodDias) && d.periodDias > 0 ? Math.round(d.periodDias) : 365;
  const price = parsePreco(d.preco);
  const sale_url = d.linkVenda.trim() || null;
  const { error } = await db.from('plans').update({ name, offer_id, period_days, price, sale_url, updated_at: new Date().toISOString() }).eq('id', d.id);
  if (error) return { ok: false, mensagem: error.code === '23505' ? 'Já existe um plano com esse ID de oferta.' : 'Não foi possível salvar o plano.' };
  revalidatePath('/admin/planos/editar'); revalidatePath('/admin/planos'); return { ok: true, mensagem: 'Plano salvo com sucesso.' };
}

async function vincularCurso(planoId: string, courseId: string): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode vincular cursos.' };
  const { error } = await db.from('plan_courses').insert({ plan_id: planoId, course_id: courseId });
  if (error) return { ok: false, mensagem: error.code === '23505' ? 'Esse curso já está vinculado.' : 'Não foi possível vincular o curso.' };
  revalidatePath('/admin/planos/editar'); revalidatePath('/admin/planos'); return { ok: true, mensagem: 'Curso vinculado.' };
}

async function desvincularCurso(planoId: string, courseId: string): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode remover cursos.' };
  const { error } = await db.from('plan_courses').delete().eq('plan_id', planoId).eq('course_id', courseId);
  if (error) return { ok: false, mensagem: 'Não foi possível remover o curso.' };
  revalidatePath('/admin/planos/editar'); revalidatePath('/admin/planos'); return { ok: true, mensagem: 'Curso removido do plano.' };
}

export default async function EditarPlanoPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = searchParams?.id || '';
  const db = createSupabaseAdminClient();
  if (!db || !id) notFound();

  const { data: plano } = await db.from('plans').select('id,name,offer_id,period_days,price,sale_url').eq('id', id).maybeSingle();
  if (!plano) notFound();

  const { data: vinc } = await db.from('plan_courses').select('course_id, courses(id,title)').eq('plan_id', id);
  const vinculados = (vinc || []).map((v: any) => ({ id: v.courses?.id || v.course_id, title: v.courses?.title || '(curso removido)' }));
  const vinculadosIds = new Set(vinculados.map((c: any) => c.id));

  const { data: todos } = await db.from('courses').select('id,title').order('title');
  const disponiveis = (todos || []).filter((c: any) => !vinculadosIds.has(c.id)).map((c: any) => ({ id: c.id, title: c.title }));

  return <><div className="crumb">⚙ Administrador › <Link href="/admin/planos">Planos</Link> › {plano.name}</div><div className="pad">
    <div className="head-row">
      <div><div className="blk-title">{plano.name}</div><p className="blk-sub">ID da oferta: {plano.offer_id}</p></div>
      <Link className="btn-ghost" href="/admin/planos"><ArrowLeft size={15} /> Voltar</Link>
    </div>

    <div className="pl-card">
      <h3>Dados do plano</h3>
      <p className="pl-carddesc">Informações da oferta e do acesso.</p>
      <PlanoDados plano={plano} salvar={salvarPlano} />
    </div>

    <div className="pl-card">
      <div className="pl-cardhead">
        <div><h3>Cursos vinculados</h3><p className="pl-carddesc">Cursos que este plano libera para a aluna.</p></div>
        <VincularCursoButton planoId={plano.id} disponiveis={disponiveis} vincular={vincularCurso} />
      </div>
      {vinculados.length ? <div className="pl-linklist">
        {vinculados.map((c: any) => <div className="pl-linkrow" key={c.id}>
          <div className="pl-linkname"><BookOpen size={15} /> {c.title}</div>
          <DesvincularCursoButton planoId={plano.id} courseId={c.id} titulo={c.title} desvincular={desvincularCurso} />
        </div>)}
      </div> : <p className="pl-linkempty">Nenhum curso vinculado ainda. Clique em “Vincular” para adicionar.</p>}
    </div>
  </div></>;
}

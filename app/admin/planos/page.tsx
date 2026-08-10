import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Layers, CalendarDays, BookOpen, Pencil } from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NovoPlanoButton, ApagarPlanoButton } from './plan-actions';
import './planos.css';

export const dynamic = 'force-dynamic';
type Resultado = { ok: boolean; mensagem: string; id?: string };

async function admin() {
  const sessao = createSupabaseServerClient(); const db = createSupabaseAdminClient();
  if (!sessao || !db) return null;
  const { data } = await sessao.auth.getUser(); if (!data.user) return null;
  const { data: p } = await db.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  return p?.role === 'admin' && p.status === 'active' ? db : null;
}

async function criarPlano(d: { nome: string; offerId: string }): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode cadastrar planos.' };
  const name = d.nome.trim(); const offer_id = d.offerId.trim();
  if (!name || !offer_id) return { ok: false, mensagem: 'Confira o nome e o ID da oferta.' };
  const { data, error } = await db.from('plans').insert({ name, offer_id }).select('id').single();
  if (error) return { ok: false, mensagem: error.code === '23505' ? 'Já existe um plano com esse ID de oferta.' : 'Não foi possível criar o plano.' };
  revalidatePath('/admin/planos'); return { ok: true, mensagem: 'Plano criado com sucesso.', id: data.id };
}

async function apagarPlano(id: string): Promise<Resultado> {
  'use server'; const db = await admin(); if (!db) return { ok: false, mensagem: 'Somente uma administradora pode apagar planos.' };
  const { error } = await db.from('plans').delete().eq('id', id);
  if (error) return { ok: false, mensagem: 'Não foi possível apagar o plano.' };
  revalidatePath('/admin/planos'); return { ok: true, mensagem: 'Plano apagado.' };
}

export default async function PlanosPage() {
  const db = createSupabaseAdminClient();
  const { data: planos, error } = db
    ? await db.from('plans').select('id,name,offer_id,period_days,price,plan_courses(id)').order('created_at', { ascending: true })
    : { data: null, error: true as any };

  return <><div className="crumb">⚙ Administrador › Planos</div><div className="pad">
    <div className="head-row">
      <div><div className="blk-title">Planos e Ofertas</div><p className="blk-sub">Cada plano liga uma oferta do Guru aos cursos que ela libera.</p></div>
      <NovoPlanoButton criar={criarPlano} />
    </div>

    {error ? <div className="pl-empty">Não foi possível carregar os planos do Supabase.</div> :
      !(planos && planos.length) ? <div className="pl-empty">Nenhum plano cadastrado ainda. Clique em “Cadastrar plano” para criar o primeiro.</div> :
      <div className="pl-list">
        {planos.map((p: any) => {
          const cursos = p.plan_courses?.length || 0;
          return <div className="pl-row" key={p.id}>
            <div className="pl-name">
              <span className="pl-ic"><Layers size={18} /></span>
              <div><b>{p.name}</b><span>ID da oferta: {p.offer_id}</span></div>
            </div>
            <div className="pl-meta"><CalendarDays size={15} /> {p.period_days} dias</div>
            <div className="pl-meta"><BookOpen size={15} /> {cursos} curso{cursos === 1 ? '' : 's'}</div>
            <div className="pl-actions">
              <Link className="iconbtn" href={`/admin/planos/editar?id=${p.id}`} aria-label="Editar plano"><Pencil size={15} /></Link>
              <ApagarPlanoButton plano={{ id: p.id, name: p.name }} apagar={apagarPlano} />
            </div>
          </div>;
        })}
      </div>}
  </div></>;
}

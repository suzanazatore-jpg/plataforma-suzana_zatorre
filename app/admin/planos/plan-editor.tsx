'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type Resultado = { ok: boolean; mensagem: string; id?: string };
type Curso = { id: string; title: string };

const MODAL_CSS = `
.sza-ov{position:fixed;inset:0;z-index:9999;background:rgba(6,6,8,.66);backdrop-filter:blur(6px);
  display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;
  font-family:'Archivo',system-ui,sans-serif}
.sza-modal{width:100%;max-width:600px;background:#141416;border:1px solid rgba(255,255,255,.08);
  border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;color:#f5f5f7;margin:auto}
.sza-modal.sza-sm{max-width:500px}
.sza-head{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 16px}
.sza-head h2{font-size:20px;font-weight:800;letter-spacing:-.01em;margin:0}
.sza-head p{color:#9a9aa2;font-size:12.5px;margin:4px 0 0}
.sza-x{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.08);
  background:#1c1c20;color:#9a9aa2;font-size:15px;cursor:pointer;line-height:1;flex-shrink:0}
.sza-x:hover{color:#fff}
.sza-body{padding:20px 24px 20px;max-height:64vh;overflow:auto}
.sza-f{margin-bottom:16px}
.sza-f label{display:block;font-size:12.5px;font-weight:600;margin-bottom:7px}
.sza-req{color:#ff2e63;margin-left:2px}
.sza-in{width:100%;background:#232327;border:1px solid transparent;border-radius:11px;color:#f5f5f7;
  font-family:inherit;font-size:14px;padding:12px 14px}
.sza-in::placeholder{color:#6f6f77}
.sza-in:focus{outline:none;background:#2b2b31;border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.14)}
`;

function SzaStyles() {
  return <style dangerouslySetInnerHTML={{ __html: MODAL_CSS }} />;
}

function useEscClose(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function PlanoDados({ plano, salvar }: {
  plano: { id: string; name: string; offer_id: string; period_days: number; price: number | null; sale_url: string | null };
  salvar: (d: { id: string; nome: string; offerId: string; periodDias: number; preco: string; linkVenda: string }) => Promise<Resultado>;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(plano.name || '');
  const [offerId, setOfferId] = useState(plano.offer_id || '');
  const [periodo, setPeriodo] = useState(String(plano.period_days ?? 365));
  const [preco, setPreco] = useState(plano.price != null ? String(plano.price) : '');
  const [link, setLink] = useState(plano.sale_url || '');
  const [busy, setBusy] = useState(false);

  async function enviar() {
    const n = nome.trim(); const o = offerId.trim();
    if (!n) { window.alert('Dê um nome para o plano.'); return; }
    if (!o) { window.alert('Informe o ID da oferta (do Guru).'); return; }
    setBusy(true);
    try {
      const r = await salvar({ id: plano.id, nome: n, offerId: o, periodDias: Number(periodo) || 0, preco: preco.trim(), linkVenda: link.trim() });
      window.alert(r.mensagem);
      if (r.ok) router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="pl-form">
      <div className="pl-frow">
        <div className="pl-field"><label>Nome do plano</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="pl-field"><label>ID da oferta</label><input value={offerId} onChange={(e) => setOfferId(e.target.value)} /></div>
      </div>
      <div className="pl-frow">
        <div className="pl-field"><label>Periodicidade em dias</label><input type="number" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></div>
        <div className="pl-field"><label>Preço <span className="opt">(opcional)</span></label><input value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex.: 497,00" /></div>
      </div>
      <div className="pl-field"><label>Link de venda/oferta <span className="opt">(botão de renovar do aluno)</span></label><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
      <div><button className="btn-pink" onClick={enviar} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
    </div>
  );
}

export function VincularCursoButton({ planoId, disponiveis, vincular }: {
  planoId: string; disponiveis: Curso[];
  vincular: (planoId: string, courseId: string) => Promise<Resultado>;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn-ghost" onClick={() => setOpen(true)}><Plus size={15} /> Vincular</button>
    {open && <VincularModal planoId={planoId} disponiveis={disponiveis} vincular={vincular} onClose={() => setOpen(false)} />}
  </>;
}

function VincularModal({ planoId, disponiveis, vincular, onClose }: {
  planoId: string; disponiveis: Curso[];
  vincular: (planoId: string, courseId: string) => Promise<Resultado>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);
  const lista = disponiveis.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()));

  async function escolher(courseId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await vincular(planoId, courseId);
      if (!r.ok) { window.alert(r.mensagem); return; }
      onClose();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="sza-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <SzaStyles />
      <div className="sza-modal sza-sm" role="dialog" aria-modal="true">
        <div className="sza-head">
          <div><h2>Vincular curso</h2><p>Selecione um curso para liberar neste plano.</p></div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f" style={{ marginBottom: 12 }}>
            <label>Selecione um curso para vincular:</label>
            <input className="sza-in" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite para filtrar…" />
          </div>
          <div className="pl-picklist">
            {lista.length ? lista.map((c) => (
              <button key={c.id} className="pl-pickrow" onClick={() => escolher(c.id)} disabled={busy}>{c.title}</button>
            )) : <div className="pl-pickempty">{disponiveis.length ? 'Nenhum curso encontrado.' : 'Todos os cursos já estão vinculados.'}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesvincularCursoButton({ planoId, courseId, titulo, desvincular }: {
  planoId: string; courseId: string; titulo: string;
  desvincular: (planoId: string, courseId: string) => Promise<Resultado>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remover() {
    if (!window.confirm(`Remover "${titulo}" deste plano?`)) return;
    setBusy(true);
    try { const r = await desvincular(planoId, courseId); if (!r.ok) window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }
  return <button className="iconbtn danger" onClick={remover} disabled={busy} aria-label="Remover curso"><Trash2 size={15} /></button>;
}

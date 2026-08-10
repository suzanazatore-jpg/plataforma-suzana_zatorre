'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type Resultado = { ok: boolean; mensagem: string; id?: string };

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
.sza-body{padding:20px 24px 4px;max-height:60vh;overflow:auto}
.sza-f{margin-bottom:16px}
.sza-f label{display:block;font-size:12.5px;font-weight:600;margin-bottom:7px}
.sza-f .hint{color:#6f6f77;font-weight:400;font-size:11.5px;margin-left:6px}
.sza-req{color:#ff2e63;margin-left:2px}
.sza-in{width:100%;background:#232327;border:1px solid transparent;border-radius:11px;color:#f5f5f7;
  font-family:inherit;font-size:14px;padding:12px 14px}
.sza-in::placeholder{color:#6f6f77}
.sza-in:focus{outline:none;background:#2b2b31;border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.14)}
.sza-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 24px 20px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px}
.sza-btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:11px;padding:11px 20px;cursor:pointer;border:1px solid transparent}
.sza-ghost{background:#1c1c20;border-color:rgba(255,255,255,.14);color:#f5f5f7}
.sza-pink{background:#ff2e63;color:#fff}
.sza-pink:disabled,.sza-ghost:disabled{opacity:.55;cursor:default}
@media(max-width:520px){.sza-btn{flex:1}}
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

export function NovoPlanoButton({ criar }: { criar: (dados: { nome: string; offerId: string }) => Promise<Resultado> }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn-pink" onClick={() => setOpen(true)}><Plus size={16} /> Cadastrar plano</button>
    {open && <PlanoModal criar={criar} onClose={() => setOpen(false)} />}
  </>;
}

function PlanoModal({ criar, onClose }: { criar: (dados: { nome: string; offerId: string }) => Promise<Resultado>; onClose: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [offerId, setOfferId] = useState('');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  async function enviar() {
    const n = nome.trim();
    const o = offerId.trim();
    if (!n) { window.alert('Dê um nome para o plano.'); return; }
    if (!o) { window.alert('Informe o ID da oferta (do Guru).'); return; }
    setBusy(true);
    try {
      const r = await criar({ nome: n, offerId: o });
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
          <div>
            <h2>Novo plano</h2>
            <p>Crie um plano de acesso. Depois você vincula os cursos e ajusta a periodicidade.</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f">
            <label>Nome do plano<span className="sza-req">*</span></label>
            <input className="sza-in" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: EVS — Equipe que Vende Sozinha" />
          </div>
          <div className="sza-f" style={{ marginBottom: 0 }}>
            <label>ID da oferta<span className="sza-req">*</span><span className="hint">é o ID do Guru — deve ser único</span></label>
            <input className="sza-in" value={offerId} onChange={(e) => setOfferId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} placeholder="Ex.: 1708388636" />
          </div>
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Criando…' : 'Cadastrar plano'}</button>
        </div>
      </div>
    </div>
  );
}

export function ApagarPlanoButton({ plano, apagar }: { plano: { id: string; name: string }; apagar: (id: string) => Promise<Resultado> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function excluir() {
    if (!window.confirm(`Apagar o plano "${plano.name}"?\n\nOs cursos vinculados a ele serão desvinculados. As matrículas já feitas continuam valendo.`)) return;
    setBusy(true);
    try { const r = await apagar(plano.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }
  return <button className="iconbtn danger" onClick={excluir} disabled={busy} aria-label="Apagar plano"><Trash2 size={15} /></button>;
}

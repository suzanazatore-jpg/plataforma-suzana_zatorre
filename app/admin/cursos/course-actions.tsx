'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Eye, Upload, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Resultado = { ok: boolean; mensagem: string; id?: string };

function slugify(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function NovoCursoButton({ criar }: { criar: (dados: { titulo: string; slug: string }) => Promise<Resultado> }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn-pink" onClick={() => setOpen(true)}><Plus size={16} /> Novo curso</button>
    {open && <CursoModal criar={criar} onClose={() => setOpen(false)} />}
  </>;
}

export function CursoButtons({ curso, editar, apagar }: {
  curso: { id: string; title: string; subtitle: string; description: string; slug: string; cover_image_url: string; sort_order: number; is_published: boolean };
  editar: (dados: typeof curso) => Promise<Resultado>;
  apagar: (id: string, confirmacao: string) => Promise<Resultado>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  async function excluir() {
    if (!window.confirm(`Apagar o curso ${curso.title}?\n\nMódulos, aulas, materiais e acessos ligados a ele também serão apagados.`)) return;
    const confirmacao = window.prompt(`Digite APAGAR para confirmar:`) || '';
    setBusy(true);
    try { const r = await apagar(curso.id, confirmacao); window.alert(r.mensagem); if (r.ok) router.push('/admin/cursos'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hactions">
      <button className="btn-ghost" onClick={() => window.open(`/preview/curso?id=${curso.id}`, '_blank')} disabled={busy}><Eye size={14} /> Visualizar como aluna</button>
      <button className="btn-ghost" onClick={() => setEditOpen(true)} disabled={busy}><Pencil size={14} /> Editar curso</button>
      <button className="btn-ghost" onClick={excluir} disabled={busy}><Trash2 size={14} /> Apagar</button>
    </div>
    {editOpen && <CursoEditModal curso={curso} editar={editar} onClose={() => setEditOpen(false)} />}
  </>;
}

export function NovoModuloButton({ cursoId, criar }: { cursoId: string; criar: (d: { courseId: string; title: string }) => Promise<Resultado> }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn-pink" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar módulo</button>
    {open && <ModuloModal cursoId={cursoId} criar={criar} onClose={() => setOpen(false)} />}
  </>;
}

export function ModuloActions({ modulo, editar, apagar }: { modulo: { id: string; title: string }; editar: (id: string, title: string) => Promise<Resultado>; apagar: (id: string) => Promise<Resultado> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function del() { if (!window.confirm(`Apagar o módulo ${modulo.title} e todas as aulas dele?`)) return; const r = await apagar(modulo.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  return <span className="mact">
    <span className="iconbtn" title="Editar" onClick={() => setOpen(true)}><Pencil size={14} /></span>
    <span className="iconbtn" title="Remover" onClick={del}><Trash2 size={14} /></span>
    {open && <ModuloEditModal modulo={modulo} editar={editar} onClose={() => setOpen(false)} />}
  </span>;
}

/* ============================================================
   MODAIS (novo visual) — substituem as janelinhas de prompt.
   Nada aqui muda o que é salvo no banco: as mesmas funções
   salvar/apagar/mover continuam sendo chamadas com os mesmos dados.
   ============================================================ */

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
.sza-tabs{display:flex;padding:0 24px;border-bottom:1px solid rgba(255,255,255,.08)}
.sza-tab{position:relative;background:none;border:none;cursor:pointer;color:#9a9aa2;font-family:inherit;
  font-size:14px;font-weight:600;padding:12px 4px 14px;margin-right:22px;display:flex;align-items:center;gap:8px}
.sza-tab .n{width:19px;height:19px;border-radius:50%;background:#232327;color:#6f6f77;font-size:11px;
  font-weight:700;display:flex;align-items:center;justify-content:center}
.sza-tab.on{color:#f5f5f7}
.sza-tab.on .n{background:#ff2e63;color:#fff}
.sza-tab.on::after{content:'';position:absolute;left:0;right:22px;bottom:-1px;height:2px;background:#ff2e63;border-radius:2px}
.sza-body{padding:20px 24px 4px;max-height:60vh;overflow:auto}
.sza-f{margin-bottom:16px}
.sza-f label{display:block;font-size:12.5px;font-weight:600;margin-bottom:7px}
.sza-f .hint{color:#6f6f77;font-weight:400;font-size:11.5px;margin-left:6px}
.sza-req{color:#ff2e63;margin-left:2px}
.sza-row{display:flex;gap:14px}.sza-row>*{flex:1}
.sza-in,.sza-ta{width:100%;background:#232327;border:1px solid transparent;border-radius:11px;color:#f5f5f7;
  font-family:inherit;font-size:14px;padding:12px 14px}
.sza-in::placeholder,.sza-ta::placeholder{color:#6f6f77}
.sza-in:focus,.sza-ta:focus{outline:none;background:#2b2b31;border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.14)}
.sza-ta{resize:vertical;min-height:84px}
.sza-tog{display:flex;align-items:center;justify-content:space-between;background:#232327;border-radius:11px;padding:12px 15px}
.sza-tog .l{font-size:14px;font-weight:500}
.sza-tog .s{font-size:11.5px;color:#6f6f77;margin-top:2px}
.sza-sw{width:46px;height:26px;border-radius:20px;background:#3a3a40;position:relative;cursor:pointer;flex-shrink:0;transition:.2s;border:none;padding:0}
.sza-sw::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}
.sza-sw.on{background:#ff2e63}.sza-sw.on::after{left:23px}
.sza-capa{display:flex;align-items:center;gap:12px;background:#232327;border-radius:11px;padding:8px 10px}
.sza-capa .bx{width:56px;height:38px;border-radius:8px;background:#1c1c20;border:1px dashed rgba(255,255,255,.14);
  display:flex;align-items:center;justify-content:center;color:#6f6f77;font-size:16px;flex-shrink:0;overflow:hidden}
.sza-capa .bx img{width:100%;height:100%;object-fit:cover}
.sza-mini{margin-left:auto;background:#1c1c20;border:1px solid rgba(255,255,255,.14);border-radius:9px;
  padding:8px 14px;font-size:12.5px;font-weight:600;color:#f5f5f7;cursor:pointer}
.sza-seg{display:flex;gap:8px}
.sza-seg .o{flex:1;background:#232327;border:1px solid transparent;border-radius:11px;padding:11px;text-align:center;
  cursor:pointer;font-size:13px;font-weight:600;color:#9a9aa2}
.sza-seg .o.on{border-color:#ff2e63;background:rgba(255,46,99,.14);color:#ff2e63}
.sza-drop{border:1.5px dashed rgba(255,255,255,.14);border-radius:14px;padding:26px 20px;text-align:center;cursor:pointer;background:#232327}
.sza-drop.hot{border-color:#ff2e63;background:rgba(255,46,99,.14)}
.sza-drop .u{font-size:22px;margin-bottom:6px}.sza-drop .t{font-size:14px;font-weight:600;word-break:break-word}
.sza-drop .s{font-size:12px;color:#6f6f77;margin-top:3px}
.sza-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 24px 20px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px}
.sza-btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:11px;padding:11px 20px;cursor:pointer;border:1px solid transparent}
.sza-ghost{background:#1c1c20;border-color:rgba(255,255,255,.14);color:#f5f5f7}
.sza-pink{background:#ff2e63;color:#fff}
.sza-pink:disabled,.sza-ghost:disabled{opacity:.55;cursor:default}
@media(max-width:520px){.sza-row{flex-direction:column;gap:16px}.sza-btn{flex:1}}
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

type AulaModalProps = {
  courseId: string;
  moduleId: string;
  aula?: { id: string; title: string; slug: string; description: string; video_url: string; thumbnail_url: string; duration_label: string; sort_order: number; is_published: boolean; materials?: { id: string; title: string; file_url?: string }[] };
  salvar: (d: { id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean; sortOrder?: number }) => Promise<Resultado>;
  salvarMaterial?: (d: any) => Promise<Resultado>;
  apagarMaterial?: (id: string, fileUrl: string) => Promise<Resultado>;
  onClose: () => void;
};

function AulaModal({ courseId, moduleId, aula, salvar, salvarMaterial, apagarMaterial, onClose }: AulaModalProps) {
  const router = useRouter();
  const capaInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'dados' | 'video' | 'materiais'>('dados');
  const [title, setTitle] = useState(aula?.title || '');
  const [duration, setDuration] = useState(aula?.duration_label || '');
  const [description, setDescription] = useState(aula?.description || '');
  const [videoUrl, setVideoUrl] = useState(aula?.video_url || '');
  const [publicada, setPublicada] = useState(aula ? aula.is_published : true);
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState(aula?.thumbnail_url || '');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  function escolherCapa(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { window.alert('Escolha uma imagem JPG, JPEG ou PNG.'); return; }
    if (file.size > 5 * 1024 * 1024) { window.alert('A capa deve ter no máximo 5 MB.'); return; }
    setCapaFile(file);
    setCapaPreview(URL.createObjectURL(file));
  }

  async function enviar() {
    const nome = title.trim();
    if (!nome) { window.alert('Dê um nome para a aula.'); setTab('dados'); return; }
    setBusy(true);
    try {
      let thumbnailUrl = aula?.thumbnail_url || '';
      if (capaFile) {
        const supabase = createClient();
        if (!supabase) { window.alert('Supabase não configurado.'); return; }
        const ext = capaFile.type === 'image/png' ? 'png' : 'jpg';
        const contentType = capaFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const path = `${courseId}/thumbnails/${moduleId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('course-covers').upload(path, capaFile, { contentType, upsert: false });
        if (error) { window.alert(`Não foi possível subir a capa: ${error.message}`); return; }
        const { data } = supabase.storage.from('course-covers').getPublicUrl(path);
        thumbnailUrl = data.publicUrl;
      }
      const slugBase = aula?.slug || slugify(nome);
      const slug = slugBase || `aula-${Date.now()}`;
      const r = await salvar({ id: aula?.id, courseId, moduleId, title: nome, slug, description: description.trim(), videoUrl: videoUrl.trim(), thumbnailUrl, duration: duration.trim(), publicada, sortOrder: aula?.sort_order });
      if (!r.ok) { window.alert(r.mensagem); return; }
      onClose();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="sza-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <SzaStyles />
      <div className="sza-modal" role="dialog" aria-modal="true">
        <div className="sza-head">
          <div>
            <h2>{aula ? 'Editar aula' : 'Nova aula'}</h2>
            <p>{aula ? 'Atualize os dados desta aula.' : 'Preencha os dados e o vídeo da aula.'}</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="sza-tabs">
          <button className={`sza-tab ${tab === 'dados' ? 'on' : ''}`} onClick={() => setTab('dados')}><span className="n">1</span>Dados</button>
          <button className={`sza-tab ${tab === 'video' ? 'on' : ''}`} onClick={() => setTab('video')}><span className="n">2</span>Vídeo</button>
          <button className={`sza-tab ${tab === 'materiais' ? 'on' : ''}`} onClick={() => setTab('materiais')}><span className="n">3</span>Materiais</button>
        </div>

        <div className="sza-body">
          {tab === 'dados' ? (
            <>
              <div className="sza-f">
                <label>Nome da aula<span className="sza-req">*</span></label>
                <input className="sza-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Aula 01 — Preparando o estoque" />
              </div>
              <div className="sza-row">
                <div className="sza-f">
                  <label>Duração<span className="hint">opcional</span></label>
                  <input className="sza-in" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex.: 15 min" />
                </div>
                <div className="sza-f">
                  <label>Capa da aula<span className="hint">opcional</span></label>
                  <div className="sza-capa">
                    <div className="bx">{capaPreview ? <img src={capaPreview} alt="" /> : '\u{1F5BC}\u{FE0F}'}</div>
                    <input ref={capaInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => escolherCapa(e.target.files?.[0])} />
                    <button className="sza-mini" type="button" onClick={() => capaInput.current?.click()}>Escolher</button>
                  </div>
                </div>
              </div>
              <div className="sza-f">
                <label>Descrição<span className="hint">opcional</span></label>
                <textarea className="sza-ta" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Escreva um resumo do que a aluna vai aprender…" />
              </div>
              <div className="sza-f">
                <div className="sza-tog">
                  <div>
                    <div className="l">Publicar aula</div>
                    <div className="s">Se desligado, fica como rascunho e a aluna não vê.</div>
                  </div>
                  <button type="button" className={`sza-sw ${publicada ? 'on' : ''}`} role="switch" aria-checked={publicada} onClick={() => setPublicada(!publicada)} aria-label="Publicar aula"></button>
                </div>
              </div>
            </>
          ) : tab === 'video' ? (
            <div className="sza-f">
              <label>Link do vídeo<span className="hint">opcional — dá pra adicionar depois</span></label>
              <input className="sza-in" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Cole aqui a URL do vídeo" />
              <div style={{ color: '#6f6f77', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>

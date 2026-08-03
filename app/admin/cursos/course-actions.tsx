'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Image, Eye, Upload, ChevronUp, ChevronDown } from 'lucide-react';
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
  const capaInput = useRef<HTMLInputElement>(null);
  async function trocarCapa() {
    const porArquivo = window.confirm('Clique em OK para subir uma capa JPG ou PNG do computador.\n\nClique em Cancelar para continuar usando um link.');
    if (porArquivo) { capaInput.current?.click(); return; }
    const cover_image_url = window.prompt('Cole o link da capa:', curso.cover_image_url || '');
    if (cover_image_url === null) return;
    setBusy(true);
    try { const r = await editar({ ...curso, cover_image_url: cover_image_url.trim() }); window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }
  async function subirCapa(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { window.alert('Escolha uma imagem JPG, JPEG ou PNG.'); return; }
    if (file.size > 5 * 1024 * 1024) { window.alert('A capa deve ter no máximo 5 MB.'); return; }
    const supabase = createClient();
    if (!supabase) { window.alert('Supabase não configurado.'); return; }
    setBusy(true);
    try {
      const extensao = file.type === 'image/png' ? 'png' : 'jpg';
      const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const path = `${curso.id}/capa-${Date.now()}.${extensao}`;
      const { error } = await supabase.storage.from('course-covers').upload(path, file, { contentType, upsert: false });
      if (error) { window.alert(`Não foi possível subir a capa: ${error.message}`); return; }
      const { data } = supabase.storage.from('course-covers').getPublicUrl(path);
      const r = await editar({ ...curso, cover_image_url: data.publicUrl });
      window.alert(r.mensagem); if (r.ok) router.refresh();
    } finally { setBusy(false); if (capaInput.current) capaInput.current.value = ''; }
  }
  async function excluir() {
    if (!window.confirm(`Apagar o curso ${curso.title}?\n\nMódulos, aulas, materiais e acessos ligados a ele também serão apagados.`)) return;
    const confirmacao = window.prompt(`Digite APAGAR para confirmar:`) || '';
    setBusy(true);
    try { const r = await apagar(curso.id, confirmacao); window.alert(r.mensagem); if (r.ok) router.push('/admin/cursos'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hactions">
      <input ref={capaInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => subirCapa(e.target.files?.[0])} />
      <button className="btn-ghost" onClick={() => window.open(`/preview/curso?id=${curso.id}`, '_blank')} disabled={busy}><Eye size={14} /> Visualizar como aluna</button>
      <button className="btn-ghost" onClick={() => setEditOpen(true)} disabled={busy}><Pencil size={14} /> Editar curso</button>
      <button className="btn-ghost" onClick={trocarCapa} disabled={busy}><Image size={14} /> Capa</button>
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
  aula?: { id: string; title: string; slug: string; description: string; video_url: string; thumbnail_url: string; duration_label: string; sort_order: number; is_published: boolean };
  salvar: (d: { id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean; sortOrder?: number }) => Promise<Resultado>;
  onClose: () => void;
};

function AulaModal({ courseId, moduleId, aula, salvar, onClose }: AulaModalProps) {
  const router = useRouter();
  const capaInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'dados' | 'video'>('dados');
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
          ) : (
            <div className="sza-f">
              <label>Link do vídeo<span className="hint">opcional — dá pra adicionar depois</span></label>
              <input className="sza-in" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Cole aqui a URL do vídeo" />
              <div style={{ color: '#6f6f77', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                Funciona com YouTube, Vimeo, PandaVídeo e Bunny. Cole o link da página do vídeo.
              </div>
            </div>
          )}
        </div>

        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Salvando…' : (aula ? 'Salvar' : 'Cadastrar aula')}</button>
        </div>
      </div>
    </div>
  );
}

export function AulaActions({ courseId, moduleId, aula, salvar, apagar, mover }: {
  courseId: string; moduleId: string;
  aula?: { id: string; title: string; slug: string; description: string; video_url: string; thumbnail_url: string; duration_label: string; sort_order: number; is_published: boolean };
  salvar: (d: { id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean; sortOrder?: number }) => Promise<Resultado>;
  apagar: (id: string) => Promise<Resultado>;
  mover: (id: string, moduleId: string, direcao: 'cima' | 'baixo') => Promise<Resultado>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() { if (!aula || !window.confirm(`Apagar a aula ${aula.title}?`)) return; const r = await apagar(aula.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  async function move(direcao: 'cima' | 'baixo') { if (!aula || busy) return; setBusy(true); try { const r = await mover(aula.id, moduleId, direcao); if (!r.ok) window.alert(r.mensagem); if (r.ok) router.refresh(); } finally { setBusy(false); } }

  if (!aula) {
    return <>
      <button onClick={() => setOpen(true)}><Plus size={14} /> Adicionar aula neste módulo</button>
      {open && <AulaModal courseId={courseId} moduleId={moduleId} salvar={salvar} onClose={() => setOpen(false)} />}
    </>;
  }
  return <>
    <span className="iconbtn" title="Subir posição" onClick={() => move('cima')}><ChevronUp size={14} /></span>
    <span className="iconbtn" title="Descer posição" onClick={() => move('baixo')}><ChevronDown size={14} /></span>
    <span className="iconbtn" title="Editar" onClick={() => setOpen(true)}><Pencil size={14} /></span>
    <span className="iconbtn" title="Remover" onClick={del}><Trash2 size={14} /></span>
    {open && <AulaModal courseId={courseId} moduleId={moduleId} aula={aula} salvar={salvar} onClose={() => setOpen(false)} />}
  </>;
}

type MaterialModalProps = {
  courseId: string;
  lessonId: string | null;
  salvar: (d: { courseId: string; lessonId: string | null; title: string; fileUrl: string }) => Promise<Resultado>;
  onClose: () => void;
};

function MaterialModal({ courseId, lessonId, salvar, onClose }: MaterialModalProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'pdf' | 'link'>('pdf');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [hot, setHot] = useState(false);
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  function escolher(f?: File) {
    if (!f) return;
    if (f.type !== 'application/pdf') { window.alert('Escolha um arquivo PDF.'); return; }
    if (f.size > 20 * 1024 * 1024) { window.alert('O PDF deve ter no máximo 20 MB.'); return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ''));
  }

  async function enviar() {
    const nome = title.trim();
    if (!nome) { window.alert('Dê um nome para o material.'); return; }
    setBusy(true);
    try {
      if (mode === 'link') {
        const url = link.trim();
        if (!url) { window.alert('Cole o link do material.'); return; }
        const r = await salvar({ courseId, lessonId, title: nome, fileUrl: url });
        if (!r.ok) { window.alert(r.mensagem); return; }
      } else {
        if (!file) { window.alert('Escolha um PDF do computador.'); return; }
        const supabase = createClient();
        if (!supabase) { window.alert('Supabase não configurado.'); return; }
        const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${courseId}/${lessonId || 'extras'}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from('course-materials').upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (error) { window.alert(`Não foi possível subir o PDF: ${error.message}`); return; }
        const r = await salvar({ courseId, lessonId, title: nome, fileUrl: `storage://course-materials/${path}` });
        if (!r.ok) { window.alert(r.mensagem); return; }
      }
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
            <h2>Adicionar material</h2>
            <p>{lessonId ? 'Fica disponível para download nesta aula.' : 'Material extra do curso, para download.'}</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f">
            <label>Nome do material<span className="sza-req">*</span></label>
            <input className="sza-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Checklist — Zerando o Estoque" />
          </div>
          <div className="sza-f">
            <label>Como você quer adicionar?</label>
            <div className="sza-seg">
              <div className={`o ${mode === 'pdf' ? 'on' : ''}`} onClick={() => setMode('pdf')}>Subir PDF do computador</div>
              <div className={`o ${mode === 'link' ? 'on' : ''}`} onClick={() => setMode('link')}>Usar um link</div>
            </div>
          </div>
          {mode === 'pdf' ? (
            <>
              <input ref={input} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => escolher(e.target.files?.[0])} />
              <div className={`sza-drop ${hot ? 'hot' : ''}`}
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setHot(true); }}
                onDragLeave={() => setHot(false)}
                onDrop={(e) => { e.preventDefault(); setHot(false); escolher(e.dataTransfer.files?.[0]); }}>
                <div className="u">⬆️</div>
                <div className="t">{file ? file.name : 'Arraste o PDF aqui'}</div>
                <div className="s">{file ? 'Clique para trocar' : 'ou clique para escolher — só PDF, até 20 MB'}</div>
              </div>
            </>
          ) : (
            <div className="sza-f" style={{ marginBottom: 0 }}>
              <input className="sza-in" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole o link do PDF (ex.: Google Drive)" />
            </div>
          )}
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Enviando…' : 'Adicionar material'}</button>
        </div>
      </div>
    </div>
  );
}

export function MaterialButton({ courseId, lessonId, salvar, label = 'Material' }: { courseId: string; lessonId: string | null; salvar: (d: { courseId: string; lessonId: string | null; title: string; fileUrl: string }) => Promise<Resultado>; label?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn-ghost" onClick={() => setOpen(true)}><Upload size={14} /> {label}</button>
    {open && <MaterialModal courseId={courseId} lessonId={lessonId} salvar={salvar} onClose={() => setOpen(false)} />}
  </>;
}

/* ============================================================
   MODAIS de criar CURSO e MÓDULO (mesmo visual dos demais).
   Continuam chamando as mesmas funções criar() — nada muda no banco.
   ============================================================ */

function CursoModal({ criar, onClose }: { criar: (dados: { titulo: string; slug: string }) => Promise<Resultado>; onClose: () => void }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  async function enviar() {
    const nome = titulo.trim();
    if (!nome) { window.alert('Dê um nome para o curso.'); return; }
    setBusy(true);
    try {
      const slug = slugify(nome) || `curso-${Date.now()}`;
      const r = await criar({ titulo: nome, slug });
      if (!r.ok) { window.alert(r.mensagem); return; }
      onClose();
      if (r.id) router.push(`/admin/cursos/editar?id=${r.id}`); else router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="sza-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <SzaStyles />
      <div className="sza-modal sza-sm" role="dialog" aria-modal="true">
        <div className="sza-head">
          <div>
            <h2>Novo curso</h2>
            <p>Depois você poderá editar os detalhes, a capa e adicionar os módulos.</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f" style={{ marginBottom: 0 }}>
            <label>Nome do curso<span className="sza-req">*</span></label>
            <input className="sza-in" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} placeholder="Ex.: Equipe que Vende Sozinha" />
          </div>
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Criando…' : 'Criar curso'}</button>
        </div>
      </div>
    </div>
  );
}

function ModuloModal({ cursoId, criar, onClose }: { cursoId: string; criar: (d: { courseId: string; title: string }) => Promise<Resultado>; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  async function enviar() {
    const nome = title.trim();
    if (!nome) { window.alert('Dê um nome para o módulo.'); return; }
    setBusy(true);
    try {
      const r = await criar({ courseId: cursoId, title: nome });
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
            <h2>Novo módulo</h2>
            <p>Módulos ajudam a organizar as aulas do curso.</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f" style={{ marginBottom: 0 }}>
            <label>Nome do módulo<span className="sza-req">*</span></label>
            <input className="sza-in" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} placeholder="Ex.: Módulo 1 — Comece por aqui" />
          </div>
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Criando…' : 'Criar módulo'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MODAIS de EDITAR curso e módulo (mesmo visual dos demais).
   Continuam chamando as mesmas funções editar() — nada muda no banco.
   O código interno (slug) e a capa não são alterados aqui: a capa
   tem o botão próprio "Capa", e o slug é preservado como está.
   ============================================================ */

function CursoEditModal({ curso, editar, onClose }: {
  curso: { id: string; title: string; subtitle: string; description: string; slug: string; cover_image_url: string; sort_order: number; is_published: boolean };
  editar: (dados: { id: string; title: string; subtitle: string; description: string; slug: string; cover_image_url: string; sort_order: number; is_published: boolean }) => Promise<Resultado>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(curso.title || '');
  const [subtitle, setSubtitle] = useState(curso.subtitle || '');
  const [description, setDescription] = useState(curso.description || '');
  const [ordem, setOrdem] = useState(String(curso.sort_order ?? 0));
  const [publicado, setPublicado] = useState(curso.is_published);
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  async function enviar() {
    const nome = title.trim();
    if (!nome) { window.alert('Dê um nome para o curso.'); return; }
    setBusy(true);
    try {
      const r = await editar({ ...curso, title: nome, subtitle: subtitle.trim(), description: description.trim(), sort_order: Number(ordem) || 0, is_published: publicado });
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
            <h2>Editar curso</h2>
            <p>Atualize as informações do curso. A capa tem o botão próprio.</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f">
            <label>Nome do curso<span className="sza-req">*</span></label>
            <input className="sza-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Equipe que Vende Sozinha" />
          </div>
          <div className="sza-f">
            <label>Subtítulo<span className="hint">opcional</span></label>
            <input className="sza-in" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Uma frase curta que aparece abaixo do nome" />
          </div>
          <div className="sza-f">
            <label>Descrição<span className="hint">opcional</span></label>
            <textarea className="sza-ta" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o que é este curso…" />
          </div>
          <div className="sza-row">
            <div className="sza-f">
              <label>Ordem de exibição<span className="hint">menor aparece antes</span></label>
              <input className="sza-in" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
            </div>
            <div className="sza-f">
              <label>Publicação</label>
              <div className="sza-tog">
                <div>
                  <div className="l">Publicado</div>
                  <div className="s">Se desligado, o curso fica oculto.</div>
                </div>
                <button type="button" className={`sza-sw ${publicado ? 'on' : ''}`} role="switch" aria-checked={publicado} onClick={() => setPublicado(!publicado)} aria-label="Publicado"></button>
              </div>
            </div>
          </div>
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModuloEditModal({ modulo, editar, onClose }: {
  modulo: { id: string; title: string };
  editar: (id: string, title: string) => Promise<Resultado>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(modulo.title || '');
  const [busy, setBusy] = useState(false);
  useEscClose(onClose);

  async function enviar() {
    const nome = title.trim();
    if (!nome) { window.alert('Dê um nome para o módulo.'); return; }
    setBusy(true);
    try {
      const r = await editar(modulo.id, nome);
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
            <h2>Editar módulo</h2>
            <p>Altere o nome do módulo.</p>
          </div>
          <button className="sza-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sza-body">
          <div className="sza-f" style={{ marginBottom: 0 }}>
            <label>Nome do módulo<span className="sza-req">*</span></label>
            <input className="sza-in" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} placeholder="Ex.: Módulo 1 — Comece por aqui" />
          </div>
        </div>
        <div className="sza-foot">
          <button className="sza-btn sza-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="sza-btn sza-pink" onClick={enviar} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

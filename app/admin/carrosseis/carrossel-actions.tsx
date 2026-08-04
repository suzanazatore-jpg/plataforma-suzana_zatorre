'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus, X, GripVertical } from 'lucide-react';

type Resultado = { ok: boolean; mensagem: string; id?: string };
type Curso = { id: string; title: string; cover_image_url?: string | null };
type Shelf = { id: string; title: string; subtitle?: string | null; is_published: boolean; sort_order: number; courses: Curso[] };

const CSS = `
.szc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.szc-head .szc-h1{font-size:20px;font-weight:800}
.szc-head .szc-sub{color:#9a9aa2;font-size:12.5px;margin-top:3px}
.szc-btn{font-family:inherit;font-size:13px;font-weight:700;border-radius:10px;padding:10px 16px;cursor:pointer;border:1px solid transparent}
.szc-pink{background:#ff2e63;color:#fff;box-shadow:0 6px 18px rgba(255,46,99,.35)}
.szc-pink:disabled,.szc-ghost:disabled{opacity:.55;cursor:default}
.szc-ghost{background:#1c1c20;border-color:rgba(255,255,255,.14);color:#f5f5f7}
.szc-empty{background:#141416;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:26px;color:#9a9aa2;text-align:center;font-size:13.5px}

.szc-shelf{background:#141416;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px;margin-bottom:12px}
.szc-shelf-top{display:flex;align-items:center;gap:12px}
.szc-info{flex:1;min-width:0}
.szc-info .szc-t{font-size:15px;font-weight:700}
.szc-info .szc-s{font-size:11.5px;color:#6f6f77;margin-top:1px}
.szc-acts{display:flex;align-items:center;gap:8px}
.szc-switch{width:42px;height:24px;border-radius:20px;background:#3a3a40;position:relative;cursor:pointer;flex:none;border:none;padding:0}
.szc-switch::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}
.szc-switch.on{background:#ff2e63}.szc-switch.on::after{left:21px}
.szc-ico{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#1c1c20;color:#9a9aa2;display:grid;place-items:center;cursor:pointer}
.szc-ico:hover{color:#f5f5f7}
.szc-ico.del:hover{color:#ff2e63;border-color:#ff2e63}
.szc-thumbs{display:flex;gap:8px;margin-top:12px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.szc-thumbs::-webkit-scrollbar{display:none}
.szc-cv{width:74px;height:48px;border-radius:8px;flex:none;display:grid;place-items:center;font-size:8px;font-weight:800;text-align:center;color:#fff;padding:4px;line-height:1.1;overflow:hidden;background-size:cover;background-position:center}
.szc-cv.grad{background:linear-gradient(135deg,#ff2e63,#b11d43)}
.szc-cv.mini{width:44px;height:29px;font-size:7px;border-radius:6px;padding:2px}

/* modal */
.szc-ov{position:fixed;inset:0;z-index:9999;background:rgba(6,6,8,.66);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;font-family:'Archivo',system-ui,sans-serif}
.szc-modal{width:100%;max-width:560px;background:#141416;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;color:#f5f5f7;margin:auto}
.szc-mhead{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 14px}
.szc-mhead h2{font-size:19px;font-weight:800;margin:0}
.szc-mhead p{color:#9a9aa2;font-size:12.5px;margin:3px 0 0}
.szc-x{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:#1c1c20;color:#9a9aa2;cursor:pointer}
.szc-mbody{padding:4px 22px 8px;max-height:62vh;overflow:auto}
.szc-f{margin-bottom:16px}
.szc-f label{display:block;font-size:12px;font-weight:600;margin-bottom:7px}
.szc-f label .h{color:#6f6f77;font-weight:400;font-size:11px;margin-left:6px}
.szc-req{color:#ff2e63}
.szc-in{width:100%;background:#232327;border:1px solid transparent;border-radius:10px;color:#f5f5f7;font-family:inherit;font-size:14px;padding:11px 13px}
.szc-in:focus{outline:none;background:#2b2b31;border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.14)}
.szc-chosen{display:flex;flex-direction:column;gap:8px}
.szc-chip{display:flex;align-items:center;gap:11px;background:#232327;border:1px solid transparent;border-radius:11px;padding:8px 10px}
.szc-chip.ghost{opacity:.35;border:1px dashed #ff2e63;background:rgba(255,46,99,.14)}
.szc-chip .g{width:28px;height:28px;flex:none;border-radius:7px;background:#1c1c20;border:1px solid rgba(255,255,255,.14);display:grid;place-items:center;color:#9a9aa2;cursor:grab;touch-action:none}
.szc-chip .nm{flex:1;min-width:0;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.szc-chip .rm{color:#6f6f77;cursor:pointer;font-size:15px;padding:4px;background:none;border:none;display:grid;place-items:center}
.szc-chip .rm:hover{color:#ff2e63}
.szc-clone{position:fixed;z-index:10000;pointer-events:none;box-shadow:0 18px 44px rgba(0,0,0,.6);border-radius:11px}
.szc-clone .szc-chip{background:#22222a;border:1px solid #ff2e63;margin:0}
.szc-empty-mini{color:#6f6f77;font-size:12.5px;padding:8px 2px}
.szc-add-btn{width:100%;text-align:left;background:#232327;border:1px dashed rgba(255,255,255,.14);border-radius:10px;padding:11px 13px;color:#9a9aa2;font-family:inherit;font-size:13.5px;cursor:pointer;margin-top:10px}
.szc-add-list{margin-top:8px;background:#1c1c20;border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;max-height:220px;overflow-y:auto}
.szc-add-item{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;font-size:13px;border:none;background:none;color:#f5f5f7;width:100%;text-align:left;font-family:inherit}
.szc-add-item:hover{background:#232327}
.szc-tog{display:flex;align-items:center;justify-content:space-between;background:#232327;border-radius:10px;padding:11px 13px}
.szc-tog .l{font-size:13.5px;font-weight:500}.szc-tog .sub{font-size:11px;color:#6f6f77;margin-top:1px}
.szc-mfoot{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px}
`;

function Capa({ curso, mini }: { curso: Curso; mini?: boolean }) {
  const hasCover = !!curso.cover_image_url;
  const style = hasCover ? { backgroundImage: `url(${curso.cover_image_url})` } : undefined;
  return <div className={`szc-cv${mini ? ' mini' : ''}${hasCover ? '' : ' grad'}`} style={style}>{hasCover ? '' : curso.title}</div>;
}

function ShelfRow({ shelf, onEdit, apagar, publicar }: {
  shelf: Shelf;
  onEdit: () => void;
  apagar: (id: string) => Promise<Resultado>;
  publicar: (id: string, isPublished: boolean) => Promise<Resultado>;
}) {
  const router = useRouter();
  const [pub, setPub] = useState(shelf.is_published);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const novo = !pub;
    setPub(novo);
    setBusy(true);
    try {
      const r = await publicar(shelf.id, novo);
      if (!r.ok) { setPub(!novo); window.alert(r.mensagem); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  async function del() {
    if (!window.confirm(`Apagar o carrossel "${shelf.title}"?`)) return;
    const r = await apagar(shelf.id);
    if (!r.ok) { window.alert(r.mensagem); return; }
    router.refresh();
  }

  return (
    <div className="szc-shelf">
      <div className="szc-shelf-top">
        <div className="szc-info">
          <div className="szc-t">{shelf.title}</div>
          <div className="szc-s">{shelf.courses.length} curso(s){shelf.subtitle ? ` · ${shelf.subtitle}` : ''}</div>
        </div>
        <div className="szc-acts">
          <button className={`szc-switch${pub ? ' on' : ''}`} disabled={busy} onClick={toggle} aria-label="Publicar carrossel"></button>
          <button className="szc-ico" onClick={onEdit} title="Editar"><Pencil size={15} /></button>
          <button className="szc-ico del" onClick={del} title="Apagar"><Trash2 size={15} /></button>
        </div>
      </div>
      {shelf.courses.length > 0 && (
        <div className="szc-thumbs">{shelf.courses.map((c) => <Capa key={c.id} curso={c} />)}</div>
      )}
    </div>
  );
}

function ShelfModal({ editing, allCourses, criar, editar, onClose }: {
  editing: Shelf | null;
  allCourses: Curso[];
  criar: (d: { title: string; subtitle: string; courseIds: string[]; publicado: boolean }) => Promise<Resultado>;
  editar: (d: { id: string; title: string; subtitle: string; courseIds: string[]; publicado: boolean }) => Promise<Resultado>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(editing?.title || '');
  const [subtitle, setSubtitle] = useState(editing?.subtitle || '');
  const [pub, setPub] = useState(editing ? editing.is_published : true);
  const [chosen, setChosen] = useState<string[]>(editing ? editing.courses.map((c) => c.id) : []);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const offRef = useRef(0);
  const chosenRef = useRef<string[]>(chosen);
  useEffect(() => { chosenRef.current = chosen; }, [chosen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byId: Record<string, Curso> = {};
  allCourses.forEach((c) => { byId[c.id] = c; });
  const disponiveis = allCourses.filter((c) => !chosen.includes(c.id));

  function linhas(): HTMLElement[] {
    return Array.from(listRef.current?.querySelectorAll('[data-chip]') || []) as HTMLElement[];
  }

  function onDown(e: any, id: string) {
    if (chosenRef.current.length < 2) return;
    e.preventDefault();
    const row = linhas().find((r) => r.dataset.id === id);
    if (!row) return;
    const rect = row.getBoundingClientRect();
    offRef.current = e.clientY - rect.top;
    const clone = document.createElement('div');
    clone.className = 'szc-clone';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.innerHTML = row.outerHTML;
    document.body.appendChild(clone);
    cloneRef.current = clone;
    dragIdRef.current = id;
    setDragId(id);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onMove(e: PointerEvent) {
    const clone = cloneRef.current;
    if (!clone) return;
    clone.style.top = (e.clientY - offRef.current) + 'px';
    const rows = linhas();
    let target = rows.length - 1;
    for (let k = 0; k < rows.length; k++) {
      const r = rows[k].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { target = k; break; }
    }
    setChosen((prev) => {
      const cur = prev.findIndex((x) => x === dragIdRef.current);
      if (cur < 0 || target === cur) return prev;
      const arr = prev.slice();
      const [item] = arr.splice(cur, 1);
      arr.splice(target, 0, item);
      return arr;
    });
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (cloneRef.current) { cloneRef.current.remove(); cloneRef.current = null; }
    dragIdRef.current = null;
    setDragId(null);
  }

  async function salvar() {
    const t = title.trim();
    if (!t) { window.alert('Dê um nome para o carrossel.'); return; }
    setBusy(true);
    try {
      const payload = { title: t, subtitle: subtitle.trim(), courseIds: chosen, publicado: pub };
      const r = editing ? await editar({ id: editing.id, ...payload }) : await criar(payload);
      if (!r.ok) { window.alert(r.mensagem); return; }
      onClose();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="szc-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="szc-modal" role="dialog" aria-modal="true">
        <div className="szc-mhead">
          <div>
            <h2>{editing ? 'Editar carrossel' : 'Novo carrossel'}</h2>
            <p>Nome, descrição e os cursos que entram nele.</p>
          </div>
          <button className="szc-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="szc-mbody">
          <div className="szc-f">
            <label>Nome da seção<span className="szc-req">*</span></label>
            <input className="szc-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Cursos de Vendas" />
          </div>
          <div className="szc-f">
            <label>Descrição curta<span className="h">opcional</span></label>
            <input className="szc-in" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex.: Para acessar, aperte na capa do curso." />
          </div>

          <div className="szc-f">
            <label>Cursos neste carrossel<span className="h">segure o ▚ e arraste pra ordenar</span></label>
            <div className="szc-chosen" ref={listRef}>
              {chosen.length === 0 ? <div className="szc-empty-mini">Nenhum curso ainda. Adicione abaixo.</div> :
                chosen.map((id) => {
                  const cu = byId[id];
                  if (!cu) return null;
                  return (
                    <div className="szc-chip" data-chip data-id={id} key={id} style={dragId === id ? { opacity: 0.35 } : undefined}>
                      <span className="g" data-handle onPointerDown={(e) => onDown(e, id)}><GripVertical size={14} /></span>
                      <Capa curso={cu} mini />
                      <div className="nm">{cu.title}</div>
                      <button className="rm" onClick={() => setChosen((prev) => prev.filter((x) => x !== id))} aria-label="Remover">✕</button>
                    </div>
                  );
                })}
            </div>

            <button className="szc-add-btn" onClick={() => setAddOpen((v) => !v)}>+ Adicionar curso ao carrossel</button>
            {addOpen && (
              <div className="szc-add-list">
                {disponiveis.length === 0 ? <div className="szc-add-item" style={{ color: '#6f6f77' }}>Todos os cursos já estão neste carrossel.</div> :
                  disponiveis.map((c) => (
                    <button className="szc-add-item" key={c.id} onClick={() => { setChosen((prev) => [...prev, c.id]); setAddOpen(false); }}>
                      <Capa curso={c} mini />{c.title}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="szc-f">
            <div className="szc-tog">
              <div><div className="l">Carrossel publicado</div><div className="sub">Se desligado, some da home da aluna.</div></div>
              <button type="button" className={`szc-switch${pub ? ' on' : ''}`} onClick={() => setPub(!pub)} aria-label="Publicado"></button>
            </div>
          </div>
        </div>
        <div className="szc-mfoot">
          <button className="szc-btn szc-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="szc-btn szc-pink" onClick={salvar} disabled={busy}>{busy ? 'Salvando…' : 'Salvar carrossel'}</button>
        </div>
      </div>
    </div>
  );
}

export function CarrosseisAdmin({ shelves, allCourses, criar, editar, apagar, publicar }: {
  shelves: Shelf[];
  allCourses: Curso[];
  criar: (d: { title: string; subtitle: string; courseIds: string[]; publicado: boolean }) => Promise<Resultado>;
  editar: (d: { id: string; title: string; subtitle: string; courseIds: string[]; publicado: boolean }) => Promise<Resultado>;
  apagar: (id: string) => Promise<Resultado>;
  publicar: (id: string, isPublished: boolean) => Promise<Resultado>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shelf | null>(null);

  function novo() { setEditing(null); setOpen(true); }
  function editar1(sh: Shelf) { setEditing(sh); setOpen(true); }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="szc-head">
        <div>
          <div className="szc-h1">Carrosséis da dashboard</div>
          <div className="szc-sub">Monte as seções de cursos que a aluna vê na home.</div>
        </div>
        <button className="szc-btn szc-pink" onClick={novo}><Plus size={15} /> Novo carrossel</button>
      </div>

      {shelves.length === 0 ? (
        <div className="szc-empty">Nenhum carrossel ainda. Clique em “Novo carrossel” para criar o primeiro.</div>
      ) : (
        shelves.map((sh) => <ShelfRow key={sh.id} shelf={sh} onEdit={() => editar1(sh)} apagar={apagar} publicar={publicar} />)
      )}

      {open && <ShelfModal editing={editing} allCourses={allCourses} criar={criar} editar={editar} onClose={() => setOpen(false)} />}
    </>
  );
}

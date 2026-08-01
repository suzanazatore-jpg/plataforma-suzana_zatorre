'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Image, Eye, Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Resultado = { ok: boolean; mensagem: string; id?: string };

function slugify(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function NovoCursoButton({ criar }: { criar: (dados: { titulo: string; slug: string }) => Promise<Resultado> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function abrir() {
    const titulo = window.prompt('Nome do novo curso:')?.trim();
    if (!titulo) return;
    const slug = window.prompt('Código interno do curso:', slugify(titulo))?.trim();
    if (!slug) return;
    setBusy(true);
    try {
      const r = await criar({ titulo, slug });
      window.alert(r.mensagem);
      if (r.ok && r.id) router.push(`/admin/cursos/editar?id=${r.id}`);
    } finally { setBusy(false); }
  }
  return <button className="btn-pink" onClick={abrir} disabled={busy}><Plus size={16} /> {busy ? 'Criando...' : 'Novo curso'}</button>;
}

export function CursoButtons({ curso, editar, apagar }: {
  curso: { id: string; title: string; subtitle: string; description: string; slug: string; cover_image_url: string; sort_order: number; is_published: boolean };
  editar: (dados: typeof curso) => Promise<Resultado>;
  apagar: (id: string, confirmacao: string) => Promise<Resultado>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const capaInput = useRef<HTMLInputElement>(null);
  async function editarCurso() {
    const title = window.prompt('Nome do curso:', curso.title)?.trim(); if (!title) return;
    const subtitle = window.prompt('Subtítulo:', curso.subtitle || '') ?? curso.subtitle;
    const description = window.prompt('Descrição:', curso.description || '') ?? curso.description;
    const slug = window.prompt('Código interno:', curso.slug)?.trim(); if (!slug) return;
    const cover_image_url = window.prompt('Link da capa:', curso.cover_image_url || '') ?? curso.cover_image_url;
    const ordem = window.prompt('Ordem de exibição:', String(curso.sort_order)); if (ordem === null) return;
    const is_published = window.confirm('Deixar este curso publicado?');
    setBusy(true);
    try { const r = await editar({ ...curso, title, subtitle, description, slug, cover_image_url, sort_order: Number(ordem) || 0, is_published }); window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }
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
  return <div className="hactions">
    <input ref={capaInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => subirCapa(e.target.files?.[0])} />
    <button className="btn-ghost" onClick={() => window.open(`/preview/curso?id=${curso.id}`, '_blank')} disabled={busy}><Eye size={14} /> Visualizar como aluna</button>
    <button className="btn-ghost" onClick={editarCurso} disabled={busy}><Pencil size={14} /> Editar curso</button>
    <button className="btn-ghost" onClick={trocarCapa} disabled={busy}><Image size={14} /> Capa</button>
    <button className="btn-ghost" onClick={excluir} disabled={busy}><Trash2 size={14} /> Apagar</button>
  </div>;
}

export function NovoModuloButton({ cursoId, criar }: { cursoId: string; criar: (d: { courseId: string; title: string }) => Promise<Resultado> }) {
  const router = useRouter();
  async function abrir() { const title = window.prompt('Nome do novo módulo:')?.trim(); if (!title) return; const r = await criar({ courseId: cursoId, title }); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  return <button className="btn-pink" onClick={abrir}><Plus size={16} /> Adicionar módulo</button>;
}

export function ModuloActions({ modulo, editar, apagar }: { modulo: { id: string; title: string }; editar: (id: string, title: string) => Promise<Resultado>; apagar: (id: string) => Promise<Resultado> }) {
  const router = useRouter();
  async function edit() { const title = window.prompt('Nome do módulo:', modulo.title)?.trim(); if (!title) return; const r = await editar(modulo.id, title); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  async function del() { if (!window.confirm(`Apagar o módulo ${modulo.title} e todas as aulas dele?`)) return; const r = await apagar(modulo.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  return <span className="mact"><span className="iconbtn" title="Editar" onClick={edit}><Pencil size={14} /></span><span className="iconbtn" title="Remover" onClick={del}><Trash2 size={14} /></span></span>;
}

export function AulaActions({ courseId, moduleId, aula, salvar, apagar, mover }: {
  courseId: string; moduleId: string; aula?: { id: string; title: string; slug: string; description: string; video_url: string; thumbnail_url: string; duration_label: string; sort_order: number; is_published: boolean };
  salvar: (d: { id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean; sortOrder?: number }) => Promise<Resultado>;
  apagar: (id: string) => Promise<Resultado>;
  mover: (id: string, moduleId: string, direcao: 'cima' | 'baixo') => Promise<Resultado>;
}) {
  const router = useRouter();
  const thumbInput = useRef<HTMLInputElement>(null);
  const pendente = useRef<{ id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean; sortOrder?: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function concluir(dados: NonNullable<typeof pendente.current>) {
    setBusy(true);
    try { const r = await salvar(dados); window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }

  async function abrir() {
    const valores = [
      aula?.title || '',
      aula?.slug || '',
      aula?.description || '',
      aula?.video_url || '',
      aula?.duration_label || ''
    ];
    const rotulos = ['Título da aula:', 'Código interno da aula:', 'Descrição da aula:', 'Link do vídeo:', 'Duração (ex.: 15 min):'];
    let passo = 0;
    while (passo < rotulos.length) {
      if (passo === 1 && !valores[1]) valores[1] = slugify(valores[0]);
      const resposta = window.prompt(`${rotulos[passo]}\n\nDigite < para voltar ao campo anterior.`, valores[passo]);
      if (resposta === null) return;
      if (resposta.trim() === '<') { passo = Math.max(0, passo - 1); continue; }
      valores[passo] = resposta.trim();
      passo += 1;
    }
    if (!valores[0] || !valores[1]) { window.alert('Título e código interno são obrigatórios.'); return; }
    const publicada = window.confirm('Deixar esta aula publicada?');
    const dados = { id: aula?.id, courseId, moduleId, title: valores[0], slug: valores[1], description: valores[2], videoUrl: valores[3], thumbnailUrl: aula?.thumbnail_url || '', duration: valores[4], publicada, sortOrder: aula?.sort_order };
    const porArquivo = window.confirm('Clique em OK para subir uma thumbnail JPG ou PNG do computador.\n\nClique em Cancelar para continuar usando um link.');
    if (porArquivo) { pendente.current = dados; thumbInput.current?.click(); return; }
    const thumbnailUrl = window.prompt('Link da thumbnail:', aula?.thumbnail_url || '');
    if (thumbnailUrl === null) return;
    await concluir({ ...dados, thumbnailUrl: thumbnailUrl.trim() });
  }

  async function subirThumbnail(file?: File) {
    const dados = pendente.current;
    if (!file || !dados) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { window.alert('Escolha uma thumbnail JPG, JPEG ou PNG.'); return; }
    if (file.size > 5 * 1024 * 1024) { window.alert('A thumbnail deve ter no máximo 5 MB.'); return; }
    const supabase = createClient(); if (!supabase) { window.alert('Supabase não configurado.'); return; }
    setBusy(true);
    try {
      const extensao = file.type === 'image/png' ? 'png' : 'jpg';
      const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const path = `${courseId}/thumbnails/${moduleId}-${Date.now()}.${extensao}`;
      const { error } = await supabase.storage.from('course-covers').upload(path, file, { contentType, upsert: false });
      if (error) { window.alert(`Não foi possível subir a thumbnail: ${error.message}`); return; }
      const { data } = supabase.storage.from('course-covers').getPublicUrl(path);
      const r = await salvar({ ...dados, thumbnailUrl: data.publicUrl });
      window.alert(r.mensagem); if (r.ok) router.refresh();
    } finally { setBusy(false); pendente.current = null; if (thumbInput.current) thumbInput.current.value = ''; }
  }

  function selecionarThumbnail() {
    if (!aula || busy) return;
    pendente.current = {
      id: aula.id, courseId, moduleId, title: aula.title, slug: aula.slug,
      description: aula.description, videoUrl: aula.video_url,
      thumbnailUrl: aula.thumbnail_url, duration: aula.duration_label,
      publicada: aula.is_published, sortOrder: aula.sort_order
    };
    thumbInput.current?.click();
  }

  async function del() { if (!aula || !window.confirm(`Apagar a aula ${aula.title}?`)) return; const r = await apagar(aula.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  async function move(direcao: 'cima' | 'baixo') { if (!aula || busy) return; setBusy(true); try { const r = await mover(aula.id, moduleId, direcao); if (!r.ok) window.alert(r.mensagem); if (r.ok) router.refresh(); } finally { setBusy(false); } }

  if (!aula) return <><input ref={thumbInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => subirThumbnail(e.target.files?.[0])} /><button onClick={abrir} disabled={busy}><Plus size={14} /> {busy ? 'Salvando...' : 'Adicionar aula neste módulo'}</button></>;
  return <><input ref={thumbInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => subirThumbnail(e.target.files?.[0])} /><button className="btn-ghost" type="button" onClick={selecionarThumbnail} disabled={busy}><Image size={14} /> {busy ? 'Enviando...' : 'Thumbnail'}</button><span className="iconbtn" title="Subir posição" onClick={() => move('cima')}><ChevronUp size={14} /></span><span className="iconbtn" title="Descer posição" onClick={() => move('baixo')}><ChevronDown size={14} /></span><span className="iconbtn" title="Editar" onClick={abrir}><Pencil size={14} /></span><span className="iconbtn" title="Remover" onClick={del}><Trash2 size={14} /></span></>;
}

export function MaterialButton({ courseId, lessonId, salvar, label = 'Material' }: { courseId: string; lessonId: string | null; salvar: (d: { courseId: string; lessonId: string | null; title: string; fileUrl: string }) => Promise<Resultado>; label?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function abrir() {
    const porArquivo = window.confirm('Clique em OK para subir um PDF do computador.\n\nClique em Cancelar para cadastrar um link.');
    if (porArquivo) { input.current?.click(); return; }
    const title = window.prompt('Nome do material:')?.trim(); if (!title) return;
    const fileUrl = window.prompt('Link do PDF ou material:')?.trim(); if (!fileUrl) return;
    const r = await salvar({ courseId, lessonId, title, fileUrl }); window.alert(r.mensagem); if (r.ok) router.refresh();
  }
  async function subirPdf(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf') { window.alert('Escolha um arquivo PDF.'); return; }
    if (file.size > 20 * 1024 * 1024) { window.alert('O PDF deve ter no máximo 20 MB.'); return; }
    const title = window.prompt('Nome do material:', file.name.replace(/\.pdf$/i, ''))?.trim(); if (!title) return;
    const supabase = createClient(); if (!supabase) { window.alert('Supabase não configurado.'); return; }
    setBusy(true);
    try {
      const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${courseId}/${lessonId || 'extras'}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from('course-materials').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) { window.alert(`Não foi possível subir o PDF: ${error.message}`); return; }
      const r = await salvar({ courseId, lessonId, title, fileUrl: `storage://course-materials/${path}` });
      window.alert(r.mensagem); if (r.ok) router.refresh();
    } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <><input ref={input} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => subirPdf(e.target.files?.[0])} /><button className="btn-ghost" onClick={abrir} disabled={busy}><Upload size={14} /> {busy ? 'Enviando...' : label}</button></>;
}

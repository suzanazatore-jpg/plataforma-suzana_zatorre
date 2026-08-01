'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Image } from 'lucide-react';

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
    const cover_image_url = window.prompt('Cole o link da nova capa:', curso.cover_image_url || '');
    if (cover_image_url === null) return;
    setBusy(true);
    try { const r = await editar({ ...curso, cover_image_url: cover_image_url.trim() }); window.alert(r.mensagem); if (r.ok) router.refresh(); }
    finally { setBusy(false); }
  }
  async function excluir() {
    if (!window.confirm(`Apagar o curso ${curso.title}?\n\nMódulos, aulas, materiais e acessos ligados a ele também serão apagados.`)) return;
    const confirmacao = window.prompt(`Digite APAGAR para confirmar:`) || '';
    setBusy(true);
    try { const r = await apagar(curso.id, confirmacao); window.alert(r.mensagem); if (r.ok) router.push('/admin/cursos'); }
    finally { setBusy(false); }
  }
  return <div className="hactions">
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

export function AulaActions({ courseId, moduleId, aula, salvar, apagar }: {
  courseId: string; moduleId: string; aula?: { id: string; title: string; slug: string; description: string; video_url: string; thumbnail_url: string; duration_label: string; is_published: boolean };
  salvar: (d: { id?: string; courseId: string; moduleId: string; title: string; slug: string; description: string; videoUrl: string; thumbnailUrl: string; duration: string; publicada: boolean }) => Promise<Resultado>;
  apagar: (id: string) => Promise<Resultado>;
}) {
  const router = useRouter();
  async function abrir() {
    const title = window.prompt('Título da aula:', aula?.title || '')?.trim(); if (!title) return;
    const slug = window.prompt('Código interno da aula:', aula?.slug || slugify(title))?.trim(); if (!slug) return;
    const description = window.prompt('Descrição da aula:', aula?.description || '') ?? '';
    const videoUrl = window.prompt('Link do vídeo:', aula?.video_url || '') ?? '';
    const thumbnailUrl = window.prompt('Link da thumbnail:', aula?.thumbnail_url || '') ?? '';
    const duration = window.prompt('Duração (ex.: 15 min):', aula?.duration_label || '') ?? '';
    const publicada = window.confirm('Deixar esta aula publicada?');
    const r = await salvar({ id: aula?.id, courseId, moduleId, title, slug, description, videoUrl, thumbnailUrl, duration, publicada }); window.alert(r.mensagem); if (r.ok) router.refresh();
  }
  async function del() { if (!aula || !window.confirm(`Apagar a aula ${aula.title}?`)) return; const r = await apagar(aula.id); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  if (!aula) return <button onClick={abrir}><Plus size={14} /> Adicionar aula neste módulo</button>;
  return <><span className="iconbtn" title="Editar" onClick={abrir}><Pencil size={14} /></span><span className="iconbtn" title="Remover" onClick={del}><Trash2 size={14} /></span></>;
}

export function MaterialButton({ courseId, lessonId, salvar }: { courseId: string; lessonId: string; salvar: (d: { courseId: string; lessonId: string; title: string; fileUrl: string }) => Promise<Resultado> }) {
  const router = useRouter();
  async function abrir() { const title = window.prompt('Nome do material:')?.trim(); if (!title) return; const fileUrl = window.prompt('Link do PDF ou material:')?.trim(); if (!fileUrl) return; const r = await salvar({ courseId, lessonId, title, fileUrl }); window.alert(r.mensagem); if (r.ok) router.refresh(); }
  return <button className="btn-ghost" onClick={abrir}><Plus size={14} /> Material</button>;
}

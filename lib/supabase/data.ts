import { BookOpen, CheckCircle2, ClipboardCheck, PlayCircle } from 'lucide-react';
import { bonuses, lessons, platformCourses } from '@/lib/course';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveMaterialUrl } from '@/lib/supabase/material-url';

/**
 * IMPORTANTE: todas as leituras usam o cliente de servidor autenticado
 * (createSupabaseServerClient). Assim as consultas rodam com a sessão da aluna
 * e passam pela RLS — o conteúdo cadastrado no admin realmente aparece pra quem
 * tem matrícula ativa. (Antes usava o cliente anônimo e caía sempre no
 * conteúdo placeholder.)
 */

function mapCourse(course: {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
}) {
  return {
    id: course.slug,
    dbId: course.id,
    eyebrow: course.subtitle || 'curso',
    title: course.title,
    description: course.description || '',
    coverImageUrl: course.cover_image_url || '',
    duration: course.slug === 'evs' ? `${lessons.length} aulas + bonus` : 'Acessar curso',
    icon: PlayCircle,
    accent: '#e6325a',
    href: `/area/${course.slug}`
  };
}

/**
 * Cursos em que a aluna logada tem matrícula ATIVA. Vazio se não estiver logada
 * ou não tiver matrícula.
 */
export async function getEnrolledCourses() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('profile_id', user.id)
    .eq('status', 'active');

  const courseIds = (enrollments || []).map((e) => e.course_id);
  if (!courseIds.length) return [];

  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, subtitle, description, cover_image_url, sort_order')
    .in('id', courseIds)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return [];

  return data.map(mapCourse);
}

/**
 * Mantido por compatibilidade: lista pública de cursos publicados.
 */
export async function getPublishedCourses() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return platformCourses;

  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, subtitle, description, cover_image_url, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return platformCourses;

  return data.map(mapCourse);
}

export async function getEvsLessons() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return lessons;

  const { data, error } = await supabase
    .from('lessons')
    .select('id, slug, title, description, duration_label, video_url, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return lessons;

  return data.map((lesson, index) => ({
    id: lesson.slug,
    dbId: lesson.id,
    eyebrow: index === 0 ? 'comece por aqui' : `aula ${index}`,
    title: lesson.title,
    description: lesson.description || '',
    duration: lesson.duration_label || '',
    icon: index === 0 ? PlayCircle : CheckCircle2,
    accent: index === 0 ? '#ff4b7a' : '#e6325a',
    videoUrl: lesson.video_url || '#'
  }));
}

export async function getEvsMaterials() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return bonuses;

  const { data, error } = await supabase
    .from('materials')
    .select('title, description, file_url, sort_order')
    .eq('is_published', true)
    .is('lesson_id', null)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return bonuses;

  return Promise.all(data.map(async (material, index) => ({
    title: material.title,
    description: material.description || '',
    icon: index === 0 ? ClipboardCheck : index === 1 ? CheckCircle2 : BookOpen,
    url: material.file_url ? await resolveMaterialUrl(supabase, material.file_url, material.title) : '#'
  })));
}

export async function getEvsLessonMaterials(lessonSlug: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('materials')
    .select('title, description, file_url, sort_order, lessons!inner(slug)')
    .eq('is_published', true)
    .eq('lessons.slug', lessonSlug)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return [];

  return Promise.all(data.map(async (material) => ({
    title: material.title,
    description: material.description || '',
    url: material.file_url ? await resolveMaterialUrl(supabase, material.file_url, material.title) : '#'
  })));
}

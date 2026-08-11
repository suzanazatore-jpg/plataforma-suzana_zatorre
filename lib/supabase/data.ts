import { BookOpen, CheckCircle2, ClipboardCheck, PlayCircle } from 'lucide-react';
import { bonuses, lessons, platformCourses } from '@/lib/course';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

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

export async function getPublishedCourseShelves<T>(courses: T[]) {
  const supabase = createSupabaseServerClient();
  if (!supabase || !courses.length) return [];

  const { data: shelves, error: shelvesError } = await supabase
    .from('course_shelves')
    .select('id, title, subtitle, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (shelvesError || !shelves?.length) return [];

  const { data: links, error: linksError } = await supabase
    .from('shelf_courses')
    .select('shelf_id, course_id, sort_order')
    .in('shelf_id', shelves.map((shelf) => shelf.id))
    .order('sort_order', { ascending: true });

  if (linksError) return [];

  const coursesById = new Map<string, T>();

  courses.forEach((course) => {
    if (
      typeof course === 'object' &&
      course !== null &&
      'dbId' in course &&
      typeof course.dbId === 'string'
    ) {
      coursesById.set(course.dbId, course);
    }
  });

  return shelves
    .map((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      subtitle: shelf.subtitle || '',
      courses: (links || [])
        .filter((link) => link.shelf_id === shelf.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((link) => coursesById.get(link.course_id))
        .filter((course): course is T => Boolean(course))
    }))
    .filter((shelf) => shelf.courses.length > 0);
}

export async function getEvsLessons() {
  const admin = createSupabaseAdminClient();
  if (!admin) return lessons;

  const { data: course } = await admin
    .from('courses')
    .select('id')
    .eq('slug', 'evs')
    .eq('is_published', true)
    .maybeSingle();
  if (!course) return lessons;

  const { data, error } = await admin
    .from('lessons')
    .select('id, slug, title, description, duration_label, video_url, sort_order')
    .eq('course_id', course.id)
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
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: course } = await admin
    .from('courses')
    .select('id')
    .eq('slug', 'evs')
    .eq('is_published', true)
    .maybeSingle();
  if (!course) return [];

  const { data, error } = await admin
    .from('materials')
    .select('id, title, description, file_url, sort_order')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .is('lesson_id', null)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return [];

  return data.map((material, index) => ({
    id: material.id,
    title: material.title,
    description: material.description || '',
    icon: index === 0 ? ClipboardCheck : index === 1 ? CheckCircle2 : BookOpen,
    url: `/api/materials/${material.id}/download`
  }));
}

export async function getEvsLessonMaterials(lessonSlug: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: course } = await admin
    .from('courses')
    .select('id')
    .eq('slug', 'evs')
    .eq('is_published', true)
    .maybeSingle();
  if (!course) return [];

  const { data: lesson } = await admin
    .from('lessons')
    .select('id')
    .eq('course_id', course.id)
    .eq('slug', lessonSlug)
    .eq('is_published', true)
    .maybeSingle();
  if (!lesson) return [];

  const { data, error } = await admin
    .from('materials')
    .select('id, title, description, file_url, sort_order')
    .eq('lesson_id', lesson.id)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return [];

  return data.map((material) => ({
    id: material.id,
    title: material.title,
    description: material.description || '',
    url: `/api/materials/${material.id}/download`
  }));
}

import { createClient } from '@supabase/supabase-js';
import { BookOpen, CheckCircle2, ClipboardCheck, PlayCircle } from 'lucide-react';
import { bonuses, lessons, platformCourses } from '@/lib/course';

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}

export async function getPublishedCourses() {
  const supabase = createSupabaseDataClient();

  if (!supabase) {
    return platformCourses;
  }

  const { data, error } = await supabase
    .from('courses')
    .select('slug, title, subtitle, description, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return platformCourses;
  }

  return data.map((course) => ({
    id: course.slug,
    eyebrow: course.subtitle || 'curso',
    title: course.title,
    description: course.description || '',
    duration: course.slug === 'evs' ? `${lessons.length} aulas + bonus` : 'Acessar curso',
    icon: PlayCircle,
    accent: '#e6325a',
    href: `/area/${course.slug}`
  }));
}

export async function getEvsLessons() {
  const supabase = createSupabaseDataClient();

  if (!supabase) {
    return lessons;
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('slug, title, description, duration_label, video_url, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return lessons;
  }

  return data.map((lesson, index) => ({
    id: lesson.slug,
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
  const supabase = createSupabaseDataClient();

  if (!supabase) {
    return bonuses;
  }

  const { data, error } = await supabase
    .from('materials')
    .select('title, description, file_url, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return bonuses;
  }

  return data.map((material, index) => ({
    title: material.title,
    description: material.description || '',
    icon: index === 0 ? ClipboardCheck : index === 1 ? CheckCircle2 : BookOpen,
    url: material.file_url || '#'
  }));
}

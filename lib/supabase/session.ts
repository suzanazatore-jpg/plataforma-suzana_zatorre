import { createSupabaseServerClient } from './server';

export type StudentProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'student' | 'admin';
  status: 'active' | 'blocked' | 'inactive';
};

export type CurrentStudent = {
  userId: string;
  email: string;
  profile: StudentProfile | null;
  displayName: string;
};

/**
 * Retorna a aluna logada (validando o token no Supabase) ou null.
 * Usa getUser() — que revalida o JWT no servidor — em vez de getSession().
 */
export async function getCurrentStudent(): Promise<CurrentStudent | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, status')
    .eq('id', user.id)
    .single();

  const displayName =
    profile?.name?.trim() ||
    (user.email ? user.email.split('@')[0] : 'Aluna');

  return {
    userId: user.id,
    email: user.email || profile?.email || '',
    profile: (profile as StudentProfile) || null,
    displayName
  };
}

/**
 * Verifica se a aluna logada tem matrícula ATIVA no curso informado (por slug).
 */
export async function hasActiveEnrollment(courseSlug: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', courseSlug)
    .single();

  if (!course) return false;

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('course_id', course.id)
    .eq('status', 'active')
    .maybeSingle();

  return Boolean(enrollment);
}

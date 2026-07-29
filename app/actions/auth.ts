'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function loginStudent(formData: FormData) {
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    redirect('/?erro=campos');
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect('/?erro=config');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect('/?erro=credenciais');
  }

  // Bloqueia login de perfis suspensos/inativos.
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .single();

  if (profile && profile.status !== 'active') {
    await supabase.auth.signOut();
    redirect('/?erro=bloqueado');
  }

  redirect('/area');
}

export async function logoutStudent() {
  const supabase = createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect('/');
}

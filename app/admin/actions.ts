'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const adminCookie = 'sz_admin_session';

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || 'SuzanaAdmin2026';
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY na Vercel para gravar dados.');
  }

  return supabase;
}

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!text) {
    throw new Error('Preencha os campos obrigatorios.');
  }

  return text;
}

function normalizeNumber(value: FormDataEntryValue | null) {
  const number = Number(typeof value === 'string' ? value : 0);
  return Number.isFinite(number) ? number : 0;
}

export async function loginAdmin(formData: FormData) {
  const password = normalizeRequiredText(formData.get('password'));

  if (password !== getAdminPassword()) {
    redirect('/admin?erro=senha');
  }

  cookies().set(adminCookie, 'ok', {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: '/',
    sameSite: 'lax',
    secure: true
  });

  redirect('/admin');
}

export async function logoutAdmin() {
  cookies().delete(adminCookie);
  redirect('/admin');
}

export async function saveCourse(formData: FormData) {
  const supabase = requireSupabaseAdmin();
  const id = normalizeText(formData.get('id'));
  const payload = {
    slug: normalizeRequiredText(formData.get('slug')),
    title: normalizeRequiredText(formData.get('title')),
    subtitle: normalizeText(formData.get('subtitle')),
    description: normalizeText(formData.get('description')),
    cover_image_url: normalizeText(formData.get('cover_image_url')),
    sort_order: normalizeNumber(formData.get('sort_order')),
    is_published: formData.get('is_published') === 'on'
  };

  const query = id
    ? supabase.from('courses').update(payload).eq('id', id)
    : supabase.from('courses').insert(payload);
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/area');
  redirect('/admin?salvo=curso');
}

export async function saveLesson(formData: FormData) {
  const supabase = requireSupabaseAdmin();
  const id = normalizeText(formData.get('id'));
  const payload = {
    course_id: normalizeRequiredText(formData.get('course_id')),
    slug: normalizeRequiredText(formData.get('slug')),
    title: normalizeRequiredText(formData.get('title')),
    description: normalizeText(formData.get('description')),
    video_url: normalizeText(formData.get('video_url')),
    duration_label: normalizeText(formData.get('duration_label')),
    sort_order: normalizeNumber(formData.get('sort_order')),
    is_published: formData.get('is_published') === 'on'
  };

  const query = id
    ? supabase.from('lessons').update(payload).eq('id', id)
    : supabase.from('lessons').insert(payload);
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/area/evs');
  redirect('/admin?salvo=aula');
}

export async function saveMaterial(formData: FormData) {
  const supabase = requireSupabaseAdmin();
  const id = normalizeText(formData.get('id'));
  const payload = {
    course_id: normalizeRequiredText(formData.get('course_id')),
    lesson_id: normalizeText(formData.get('lesson_id')),
    title: normalizeRequiredText(formData.get('title')),
    description: normalizeText(formData.get('description')),
    file_url: normalizeRequiredText(formData.get('file_url')),
    sort_order: normalizeNumber(formData.get('sort_order')),
    is_published: formData.get('is_published') === 'on'
  };

  const query = id
    ? supabase.from('materials').update(payload).eq('id', id)
    : supabase.from('materials').insert(payload);
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/area/evs');
  redirect('/admin?salvo=material');
}

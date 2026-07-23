-- Esquema inicial sugerido para a Plataforma EVS.
-- Rode no SQL Editor do Supabase quando for conectar login real e automação.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  source text default 'guru',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_slug text not null default 'evs',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(student_id, course_slug)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_slug text not null default 'evs',
  lesson_id text not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(student_id, course_slug, lesson_id)
);

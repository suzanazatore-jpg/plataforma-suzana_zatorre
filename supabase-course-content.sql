-- Execute uma vez no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  title text not null, description text, sort_order integer not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade, slug text not null, title text not null, description text,
  video_url text, thumbnail_url text, duration_label text, sort_order integer not null default 0,
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(course_id, slug)
);
alter table public.lessons add column if not exists thumbnail_url text;
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade, title text not null, description text, file_url text not null,
  sort_order integer not null default 0, is_published boolean not null default true, created_at timestamptz not null default now(),
  constraint materials_course_or_lesson check (course_id is not null or lesson_id is not null)
);
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
drop policy if exists "students can read published modules" on public.modules;
create policy "students can read published modules" on public.modules for select using (is_published=true);
drop policy if exists "students can read published lessons" on public.lessons;
create policy "students can read published lessons" on public.lessons for select using (is_published=true and exists(select 1 from public.enrollments e where e.profile_id=auth.uid() and e.course_id=lessons.course_id and e.status='active'));
drop policy if exists "students can read published materials" on public.materials;
create policy "students can read published materials" on public.materials for select using (is_published=true and exists(select 1 from public.enrollments e where e.profile_id=auth.uid() and e.course_id=materials.course_id and e.status='active'));

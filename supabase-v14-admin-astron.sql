-- V14 - Admin estilo Astron: cursos > modulos > aulas > materiais.
-- Rode este arquivo no SQL Editor do Supabase antes de testar o upload de materiais.

create extension if not exists pgcrypto;

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons
add column if not exists module_id uuid references public.modules(id) on delete set null;

drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

alter table public.modules enable row level security;

drop policy if exists "students can read published modules" on public.modules;
create policy "students can read published modules"
on public.modules for select
using (is_published = true);

insert into public.modules (course_id, title, description, sort_order, is_published)
select id, 'Modulo 1 - Comece por aqui', 'Primeiras aulas e materiais do EVS.', 1, true
from public.courses
where slug = 'evs'
  and not exists (
    select 1 from public.modules m where m.course_id = courses.id
  );

update public.lessons
set module_id = (
  select m.id
  from public.modules m
  join public.courses c on c.id = m.course_id
  where c.slug = 'evs'
  order by m.sort_order
  limit 1
)
where module_id is null
  and course_id = (select id from public.courses where slug = 'evs');

insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read course materials" on storage.objects;
create policy "public can read course materials"
on storage.objects for select
using (bucket_id = 'course-materials');

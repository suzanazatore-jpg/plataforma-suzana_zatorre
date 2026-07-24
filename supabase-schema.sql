-- Academia de Vendas Suzana Zatorre
-- Schema base para Supabase: alunos, cursos, aulas, materiais, matriculas e progresso.
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  video_url text,
  duration_label text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, slug)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint materials_course_or_lesson check (course_id is not null or lesson_id is not null)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'blocked', 'refunded', 'expired')),
  source text default 'guru',
  external_order_id text,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(profile_id, lesson_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text,
  external_id text,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists enrollments_set_updated_at on public.enrollments;
create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "students can read own profile" on public.profiles;
create policy "students can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "students can update own profile" on public.profiles;
create policy "students can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "students can read published courses" on public.courses;
create policy "students can read published courses"
on public.courses for select
using (is_published = true);

drop policy if exists "students can read published modules" on public.modules;
create policy "students can read published modules"
on public.modules for select
using (is_published = true);

drop policy if exists "students can read published lessons" on public.lessons;
create policy "students can read published lessons"
on public.lessons for select
using (
  is_published = true
  and exists (
    select 1
    from public.enrollments e
    where e.profile_id = auth.uid()
      and e.course_id = lessons.course_id
      and e.status = 'active'
  )
);

drop policy if exists "students can read published materials" on public.materials;
create policy "students can read published materials"
on public.materials for select
using (
  is_published = true
  and (
    exists (
      select 1
      from public.enrollments e
      where e.profile_id = auth.uid()
        and e.course_id = materials.course_id
        and e.status = 'active'
    )
    or exists (
      select 1
      from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = materials.lesson_id
        and e.profile_id = auth.uid()
        and e.status = 'active'
    )
  )
);

drop policy if exists "students can read own enrollments" on public.enrollments;
create policy "students can read own enrollments"
on public.enrollments for select
using (profile_id = auth.uid());

drop policy if exists "students can read own progress" on public.lesson_progress;
create policy "students can read own progress"
on public.lesson_progress for select
using (profile_id = auth.uid());

drop policy if exists "students can insert own progress" on public.lesson_progress;
create policy "students can insert own progress"
on public.lesson_progress for insert
with check (profile_id = auth.uid());

drop policy if exists "students can update own progress" on public.lesson_progress;
create policy "students can update own progress"
on public.lesson_progress for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

insert into public.courses (slug, title, subtitle, description, cover_image_url, sort_order, is_published)
values (
  'evs',
  'EVS - Equipe que Vende Sozinha',
  'Curso principal',
  'Implante rotina, padrao comercial e acompanhamento para vender sem depender de voce.',
  'https://suzanazatorre.com.br/wp-content/uploads/2026/01/chatgpt-image-31-de-jan-de-2026-22-15-51.jpg',
  1,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  cover_image_url = excluded.cover_image_url,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

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

insert into public.lessons (course_id, slug, title, description, duration_label, sort_order, is_published)
select c.id, v.slug, v.title, v.description, v.duration_label, v.sort_order, true
from public.courses c
cross join (
  values
    ('comece', 'Boas-vindas ao EVS', 'Entenda como usar a plataforma e por onde começar a implantar o método na sua loja.', '06 min', 1),
    ('aula-1', 'Faça qualquer vendedora atender do jeito que você atenderia', 'Crie um padrão simples para atendimento, sem precisar repetir orientação todos os dias.', '18 min', 2),
    ('aula-2', 'Corrija erros sem criar atrito', 'Aprenda a cobrar resultado sem desmotivar quem vende e sem perder respeito.', '15 min', 3),
    ('aula-3', 'Faça toda a equipe seguir o mesmo padrão', 'Organize a rotina para a loja vender com processo, mesmo quando você não estiver presente.', '17 min', 4),
    ('aula-4', 'Descubra quem precisa de ajuda antes da meta ser perdida', 'Acompanhe desempenho com clareza e aja antes do fechamento do mês.', '14 min', 5),
    ('aula-5', 'Transforme conversas esquecidas em vendas recuperadas', 'Aproveite melhor WhatsApp, provador e cada oportunidade que já existe na loja.', '16 min', 6),
    ('aula-6', 'Faça sua equipe executar de verdade', 'Transforme orientação em prática, porque entender não significa executar.', '19 min', 7)
) as v(slug, title, description, duration_label, sort_order)
where c.slug = 'evs'
on conflict (course_id, slug) do update set
  title = excluded.title,
  description = excluded.description,
  duration_label = excluded.duration_label,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.materials (course_id, title, description, file_url, sort_order, is_published)
select c.id, v.title, v.description, v.file_url, v.sort_order, true
from public.courses c
cross join (
  values
    ('Diagnóstico Comercial Personalizado', 'Descubra onde sua loja perde vendas e quais ajustes fazer primeiro.', '#', 1),
    ('Checklist Equipe que Vende Sozinha', 'Use no dia a dia para manter o padrão da equipe funcionando.', '#', 2),
    ('E-book: Os 7 erros que impedem uma equipe de vender sozinha', 'Evite os erros que mantêm a equipe dependente da dona.', '#', 3)
) as v(title, description, file_url, sort_order)
where c.slug = 'evs';

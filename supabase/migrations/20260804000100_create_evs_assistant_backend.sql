-- Backend da Assistente EVS
create extension if not exists pgcrypto;

create table if not exists public.evs_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evs_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.evs_assistant_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  needs_human_support boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.evs_assistant_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.evs_assistant_conversations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  status text not null default 'pending' check (status in ('pending', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create table if not exists public.evs_assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  lesson_number integer not null check (lesson_number between 1 and 7),
  title text not null,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evs_assistant_conversations_user_idx
  on public.evs_assistant_conversations(user_id, updated_at desc);
create index if not exists evs_assistant_messages_conversation_idx
  on public.evs_assistant_messages(conversation_id, created_at);
create index if not exists evs_assistant_unanswered_status_idx
  on public.evs_assistant_unanswered_questions(status, created_at);
create index if not exists evs_assistant_knowledge_lesson_idx
  on public.evs_assistant_knowledge(lesson_number, sort_order);

alter table public.evs_assistant_conversations enable row level security;
alter table public.evs_assistant_messages enable row level security;
alter table public.evs_assistant_unanswered_questions enable row level security;
alter table public.evs_assistant_knowledge enable row level security;

drop policy if exists "Aluna gerencia suas conversas EVS" on public.evs_assistant_conversations;
create policy "Aluna gerencia suas conversas EVS"
on public.evs_assistant_conversations for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Aluna le suas mensagens EVS" on public.evs_assistant_messages;
create policy "Aluna le suas mensagens EVS"
on public.evs_assistant_messages for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Aluna cria suas mensagens EVS" on public.evs_assistant_messages;
create policy "Aluna cria suas mensagens EVS"
on public.evs_assistant_messages for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.evs_assistant_conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Aluna registra suas duvidas EVS" on public.evs_assistant_unanswered_questions;
create policy "Aluna registra suas duvidas EVS"
on public.evs_assistant_unanswered_questions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Aluna acompanha suas duvidas EVS" on public.evs_assistant_unanswered_questions;
create policy "Aluna acompanha suas duvidas EVS"
on public.evs_assistant_unanswered_questions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Alunas leem conhecimento EVS" on public.evs_assistant_knowledge;
create policy "Alunas leem conhecimento EVS"
on public.evs_assistant_knowledge for select
to authenticated
using (true);

grant select, insert, update, delete on public.evs_assistant_conversations to authenticated;
grant select, insert on public.evs_assistant_messages to authenticated;
grant select, insert on public.evs_assistant_unanswered_questions to authenticated;
grant select on public.evs_assistant_knowledge to authenticated;

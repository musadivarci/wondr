create extension if not exists pgcrypto;

create table if not exists public.topics (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  notes text not null default '',
  note_count integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_studied_at timestamptz,
  archived_at timestamptz,
  primary key (user_id, id)
);

alter table public.topics add column if not exists archived_at timestamptz;

create table if not exists public.topic_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_topic_id text not null,
  target_topic_id text not null,
  relation_type text not null check (relation_type in ('parent', 'child', 'related')),
  unique (user_id, source_topic_id, target_topic_id, relation_type),
  foreign key (user_id, source_topic_id) references public.topics(user_id, id) on delete cascade,
  foreign key (user_id, target_topic_id) references public.topics(user_id, id) on delete cascade,
  check (source_topic_id <> target_topic_id)
);

create table if not exists public.study_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  text text not null,
  topic_id text not null,
  source_excerpt text not null default '',
  created_at timestamptz not null,
  status text not null default 'todo' check (status in ('todo', 'done')),
  primary key (user_id, id),
  foreign key (user_id, topic_id) references public.topics(user_id, id) on delete cascade
);

create table if not exists public.study_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  topic_id text not null,
  started_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, topic_id) references public.topics(user_id, id) on delete cascade
);

create table if not exists public.topic_order (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  position integer not null,
  primary key (user_id, topic_id),
  foreign key (user_id, topic_id) references public.topics(user_id, id) on delete cascade
);

create table if not exists public.highlights (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  topic_id text not null,
  selected_text text not null,
  start_offset integer not null default 0,
  end_offset integer not null default 0,
  context_before text not null default '',
  context_after text not null default '',
  created_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, topic_id) references public.topics(user_id, id) on delete cascade
);

create table if not exists public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  topic_id text not null,
  content text not null,
  study_history_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, topic_id) references public.topics(user_id, id) on delete cascade,
  foreign key (user_id, study_history_id) references public.study_history(user_id, id) on delete set null
);

create index if not exists topics_user_updated_idx on public.topics(user_id, updated_at desc);
create index if not exists relations_user_source_idx on public.topic_relations(user_id, source_topic_id);
create index if not exists relations_user_target_idx on public.topic_relations(user_id, target_topic_id);
create index if not exists study_items_user_topic_idx on public.study_items(user_id, topic_id);
create index if not exists study_history_user_topic_idx on public.study_history(user_id, topic_id, started_at desc);
create index if not exists highlights_user_idx on public.highlights(user_id);
create index if not exists highlights_user_topic_idx on public.highlights(user_id, topic_id);
create index if not exists notes_user_idx on public.notes(user_id);
create index if not exists notes_user_topic_idx on public.notes(user_id, topic_id);
create index if not exists notes_user_created_idx on public.notes(user_id, created_at desc);

alter table public.topics enable row level security;
alter table public.topic_relations enable row level security;
alter table public.study_items enable row level security;
alter table public.study_history enable row level security;
alter table public.topic_order enable row level security;
alter table public.highlights enable row level security;
alter table public.notes enable row level security;

do $$
begin
  drop policy if exists "Users manage own topics" on public.topics;
  create policy "Users manage own topics" on public.topics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own relations" on public.topic_relations;
  create policy "Users manage own relations" on public.topic_relations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own study items" on public.study_items;
  create policy "Users manage own study items" on public.study_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own study history" on public.study_history;
  create policy "Users manage own study history" on public.study_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own topic order" on public.topic_order;
  create policy "Users manage own topic order" on public.topic_order for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own highlights" on public.highlights;
  create policy "Users manage own highlights" on public.highlights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "Users manage own notes" on public.notes;
  create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
end $$;

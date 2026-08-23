create table if not exists public.quick_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  category text not null default 'Genel',
  content text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create index if not exists quick_notes_user_updated_idx on public.quick_notes(user_id, updated_at desc);
create index if not exists quick_notes_user_category_idx on public.quick_notes(user_id, category);

alter table public.quick_notes enable row level security;

drop policy if exists "Users manage own quick notes" on public.quick_notes;
create policy "Users manage own quick notes"
  on public.quick_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

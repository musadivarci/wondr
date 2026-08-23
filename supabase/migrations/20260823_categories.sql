create table if not exists public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  parent_id text,
  position integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, parent_id) references public.categories(user_id, id) on delete restrict
);

create index if not exists categories_user_parent_position_idx
  on public.categories(user_id, parent_id, position);

alter table public.categories enable row level security;

drop policy if exists "Users manage own categories" on public.categories;
create policy "Users manage own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.topics add column if not exists category_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_category_fk'
  ) then
    alter table public.topics
      add constraint topics_category_fk
      foreign key (user_id, category_id)
      references public.categories(user_id, id)
      on delete set null;
  end if;
end $$;

create index if not exists topics_user_category_idx
  on public.topics(user_id, category_id);

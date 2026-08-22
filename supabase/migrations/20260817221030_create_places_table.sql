-- "Would return" status for a place
create type public.would_return as enum ('yes', 'no', 'maybe');

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  location text,
  phone text,
  url text,
  would_return public.would_return not null,
  created_at timestamptz not null default now()
);

comment on table public.places is 'Sitios (restaurantes, etc.) guardados por cada usuario.';

-- FK columns are not auto-indexed by Postgres, and this column also backs the RLS policies below
create index places_user_id_idx on public.places (user_id);

alter table public.places enable row level security;

create policy "Users can view their own places"
on public.places for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Users can insert their own places"
on public.places for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Users can update their own places"
on public.places for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

create policy "Users can delete their own places"
on public.places for delete
to authenticated
using ( (select auth.uid()) = user_id );

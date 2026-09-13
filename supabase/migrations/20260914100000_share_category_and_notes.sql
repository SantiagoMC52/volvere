-- Two additions to what a share link shows.
--
-- The category always travels: it says what the place is, not what its owner
-- thinks of it, and a visitor opening "El Mirador" with an address and a photo
-- can't otherwise tell a restaurant from a hotel from a parking.
--
-- The notes travel only when the owner says so, per place. Some notes are
-- directions and tips worth passing on; others are for oneself. Off by
-- default, so a place is never sharing more than it did before this change.
alter table public.places
  add column share_description boolean not null default false;

comment on column public.places.share_description is 'Si el enlace público incluye las notas. Se apaga al revocar el enlace.';

-- The return type is the privacy boundary (see 20260826161515), and Postgres
-- can't alter a function's return type in place, so the function is replaced.
-- Everything said about it there still holds: security definer, no auth.uid()
-- check because the caller is meant to be anonymous, nothing returned without
-- an exact token match.
--
-- `description` is decided here and not in the page: when sharing is off the
-- column never leaves the database, so no caller can leak it by accident.
drop function public.get_shared_place(uuid);

create function public.get_shared_place(token uuid)
returns table (
  name text,
  category public.place_category,
  description text,
  location text,
  phone text,
  phone_secondary text,
  url text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.name,
    p.category,
    case when p.share_description then p.description end,
    p.location,
    p.phone,
    p.phone_secondary,
    p.url
  from public.places p
  where p.share_token = token;
$$;

comment on function public.get_shared_place(uuid) is 'Devuelve el sitio de un enlace compartido, o nada si el token no existe. Las notas solo si share_description.';

-- Dropping the function dropped its grants with it; same ones as before.
revoke execute on function public.get_shared_place(uuid) from public;
grant execute on function public.get_shared_place(uuid) to anon, authenticated;

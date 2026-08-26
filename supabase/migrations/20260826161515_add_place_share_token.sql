-- Read-only public sharing for a place. The token *is* the credential: whoever
-- holds the link sees the place, and clearing the column revokes every copy of
-- it at once.

alter table public.places
  add column share_token uuid;

comment on column public.places.share_token is 'Token del enlace público de solo lectura. Null = el sitio no está compartido.';

-- Partial, because almost every row is null and those nulls don't need to be
-- in the index. Unique so a token never points at two places, whatever
-- generates it.
create unique index places_share_token_key
  on public.places (share_token)
  where share_token is not null;

-- Reading by token goes through a function rather than an RLS policy for
-- `anon`. A policy would have to read `using (share_token is not null)`, which
-- lets anyone with the publishable key list *every* shared place — the token
-- would stop being a secret. A function only ever answers about the one token
-- it is handed.
--
-- Hence security definer, and hence no auth.uid() check inside: the caller is
-- meant to be anonymous. What keeps it safe is that it returns nothing without
-- an exact token match.
--
-- The return type is the whole privacy boundary of this feature, so it lists
-- only what a visitor is meant to see. Everything else is left out on purpose:
-- `description`, `would_return` and `created_at` are a private verdict written
-- for oneself, and `user_id` identifies the owner. Enforcing it here rather
-- than in the page means no future caller can leak them by accident.
create function public.get_shared_place(token uuid)
returns table (
  name text,
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
  select p.name, p.location, p.phone, p.phone_secondary, p.url
  from public.places p
  where p.share_token = token;
$$;

comment on function public.get_shared_place(uuid) is 'Devuelve el sitio de un enlace compartido, o nada si el token no existe.';

create function public.get_shared_place_images(token uuid)
returns table (id uuid, storage_path text)
language sql
security definer
set search_path = ''
stable
as $$
  select i.id, i.storage_path
  from public.place_images i
  join public.places p on p.id = i.place_id
  where p.share_token = token
  order by i.sort_order;
$$;

comment on function public.get_shared_place_images(uuid) is 'Devuelve las rutas de las fotos de un enlace compartido, en orden.';

-- Postgres grants execute on a new function to `public` by default, so the
-- revoke is what makes the grants below mean something.
revoke execute on function public.get_shared_place(uuid) from public;
revoke execute on function public.get_shared_place_images(uuid) from public;

grant execute on function public.get_shared_place(uuid) to anon, authenticated;
grant execute on function public.get_shared_place_images(uuid) to anon, authenticated;

-- No storage policy for `anon`, on purpose. Postgres has no separate privilege
-- for listing: `select` on storage.objects is what both signing an object and
-- walking the bucket require, so a policy that let a visitor sign the photos of
-- a shared place also let anyone with the publishable key enumerate the bucket
-- and pull those photos without ever holding a link. Measured, not assumed —
-- the first version of this migration did exactly that.
--
-- So the bucket stays reachable only by its owner, and the share page signs its
-- photos server-side with the secret key, after the token has been checked.
-- See lib/supabase/admin.ts.

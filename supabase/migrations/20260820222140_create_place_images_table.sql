-- Index of the photos in the `place-images` bucket. The bytes live in
-- Storage; this table keeps the ordering and the place they belong to.
create table public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  -- Always {user_id}/{place_id}/{uuid}.webp — the layout the bucket policies
  -- key off.
  storage_path text not null unique,
  sort_order smallint not null,
  created_at timestamptz not null default now(),

  -- Together these cap a place at 5 photos: 5 slots, none shareable. Keep in
  -- sync with MAX_IMAGES_PER_PLACE in lib/images.ts.
  constraint place_images_sort_order_range check (sort_order between 0 and 4),
  constraint place_images_place_id_sort_order_key unique (place_id, sort_order)
);

comment on table public.place_images is 'Fotos de cada sitio, guardadas en el bucket place-images.';

-- No separate index on place_id: the unique constraint above already builds a
-- (place_id, sort_order) btree, which covers both the FK and the ORDER BY.

alter table public.place_images enable row level security;

-- Ownership lives on public.places, so every policy hops through it. The
-- user_id check is redundant with the RLS on places, but keeps these policies
-- correct on their own rather than by inheritance.
create policy "Users can view images of their own places"
on public.place_images for select
to authenticated
using (
  exists (
    select 1 from public.places p
    where p.id = place_id and p.user_id = (select auth.uid())
  )
);

create policy "Users can insert images on their own places"
on public.place_images for insert
to authenticated
with check (
  exists (
    select 1 from public.places p
    where p.id = place_id and p.user_id = (select auth.uid())
  )
);

create policy "Users can delete images of their own places"
on public.place_images for delete
to authenticated
using (
  exists (
    select 1 from public.places p
    where p.id = place_id and p.user_id = (select auth.uid())
  )
);

-- Same as places: RLS policies don't grant table-level access on their own.
-- No UPDATE — saving rewrites the rows (delete + insert), never edits one.
grant select, insert, delete on public.place_images to authenticated;

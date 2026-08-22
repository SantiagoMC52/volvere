-- Private bucket for place photos. Objects are stored under
-- {user_id}/{place_id}/{filename} so RLS can scope access per owner.
insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', false);

create policy "Users can view their own place images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'place-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can upload their own place images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'place-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

-- INSERT + SELECT + UPDATE are all required for upsert uploads to work
create policy "Users can replace their own place images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'place-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'place-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own place images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'place-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

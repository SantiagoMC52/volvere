-- The bucket was created without limits, so it would accept a 50 MB file of
-- any type (the Free-plan ceiling). Uploads are compressed to WebP in the
-- browser first (lib/images.ts), because image transformations are a Pro-plan
-- feature and the stored file is the one we serve. 2 MB is a generous ceiling
-- for that.
update storage.buckets
set
  file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'place-images';

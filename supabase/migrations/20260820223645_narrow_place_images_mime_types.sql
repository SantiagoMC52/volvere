-- Every upload is re-encoded to WebP by the browser before it leaves (see
-- lib/images.ts), so `image/webp` is the only content type the app can ever
-- send. Accepting jpeg and png too only widened what a direct call to the
-- Storage API could write.
update storage.buckets
set allowed_mime_types = array['image/webp']
where id = 'place-images';

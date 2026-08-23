-- Place photos are stored as JPEG now, not WebP.
--
-- WebKit cannot encode WebP from a canvas: not Safari on any platform, and on
-- iOS that means every browser, since they all run on it. It doesn't fail
-- either — a browser asked for a type it can't write falls back to PNG in
-- silence, and a PNG of a photo is several MB, past the 2 MB limit set in
-- 20260820222146_restrict_place_images_bucket.sql. Uploads from an iPhone had
-- been failing on exactly that.
--
-- compressImage now writes JPEG everywhere rather than branching per browser
-- (lib/images.ts), so the rule this bucket has always followed still holds:
-- it accepts the one format the app produces, and nothing else.
--
-- Photos already stored are WebP and stay readable — allowed_mime_types only
-- gates new uploads.
update storage.buckets
set allowed_mime_types = array['image/jpeg']
where id = 'place-images';

-- New keys end in .jpg. The bucket policies only read the first folder
-- segment, so nothing keys off the extension, but the note in
-- 20260820222140_create_place_images_table.sql promised .webp for every row.
comment on column public.place_images.storage_path is
  'Ruta en el bucket place-images: {user_id}/{place_id}/{uuid}.{ext}, donde ext es el formato con el que se escribió la foto (.jpg desde 2026-08-23, .webp antes).';
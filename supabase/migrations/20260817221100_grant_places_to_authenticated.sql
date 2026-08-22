-- New tables are no longer auto-exposed to the Data API (Supabase changelog,
-- 2026-10-30 breaking change already in effect on this project). RLS policies
-- alone don't grant table-level access — anon stays fully locked out since the
-- app requires login; authenticated gets table access, RLS still scopes rows.
grant select, insert, update, delete on public.places to authenticated;

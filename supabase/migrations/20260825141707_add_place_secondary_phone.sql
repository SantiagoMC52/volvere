-- A second, optional phone. Some places have a landline and a mobile, and
-- there was only room for one of them.
--
-- Same rules as `phone` — digits only, no country prefix, 6 to 15 of them —
-- so the two columns hold the same kind of value and everything that reads
-- one can read the other. See lib/place-limits.ts.
--
-- No backfill and no separate validation step: every existing row gets null
-- here, and a check constraint is satisfied when it evaluates to unknown, so
-- the column and its constraint can go on in one statement.

alter table public.places
  add column phone_secondary text,
  add constraint places_phone_secondary_format
    check (phone_secondary ~ '^\d{6,15}$');

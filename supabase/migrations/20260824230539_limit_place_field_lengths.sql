-- Length and format limits for the places fields, mirroring lib/place-limits.ts.
-- The form caps each input and the Server Action rejects anything longer, so
-- these constraints only bite on writes that never went through either one:
-- the SQL editor, a future client, a bug.
--
-- char_length counts characters where JavaScript's String#length counts UTF-16
-- code units, so an emoji costs 2 there and 1 here. The app is the stricter of
-- the two, which is the right way round: nothing it accepts can fail here.

-- Numbers saved before the digits-only rule could still carry separators, and
-- places_phone_format would reject those rows. Normalise them first — the app
-- already strips the separators from the field when such a place is edited, so
-- this only brings the stored value forward to what the next edit would write.
update public.places
set phone = nullif(regexp_replace(phone, '\D', '', 'g'), '')
where phone is not null
  and phone !~ '^\d+$';

alter table public.places
  add constraint places_name_length
    check (char_length(name) between 1 and 50),
  add constraint places_description_length
    check (char_length(description) <= 400),
  add constraint places_location_length
    check (char_length(location) <= 500),
  add constraint places_url_length
    check (char_length(url) <= 500),
  -- Digits only, no country prefix. 15 is the E.164 maximum, so a place saved
  -- abroad still fits; 6 rules out an obvious typo without tying the column to
  -- any one country's numbering plan.
  add constraint places_phone_format
    check (phone ~ '^\d{6,15}$');
-- One category per place, from a closed list, so the list can be filtered by
-- kind ("only the parkings") the same way it is filtered by would_return.
--
-- An enum rather than free text on purpose: free tags fragment ("Comida",
-- "comida", "Restaurante") and a filter over them stops meaning anything.
-- Adding a category later is one `alter type … add value`, and the app keeps
-- its copy of the list in lib/place-category.ts.
create type public.place_category as enum (
  'food',
  'lodging',
  'parking',
  'leisure',
  'shopping',
  'other'
);

-- 'other' is what the rows saved before this column existed get. Not null
-- with a default, rather than nullable: the form always asks for one, and a
-- nullable column would need a "sin categoría" that is neither a category nor
-- the absence of one. Those rows can be reclassified by editing them.
alter table public.places
  add column category public.place_category not null default 'other';

comment on column public.places.category is 'Categoría del sitio (comida, alojamiento, parking…). Lista cerrada.';

create table if not exists checklist_items (
  id      uuid primary key default gen_random_uuid(),
  zone    text not null,
  "order" integer not null,
  label   text not null,
  active  boolean not null default true
);

alter table checklist_items enable row level security;

create policy "Authenticated users can read checklist items"
  on checklist_items for select to authenticated
  using (true);

create policy "Authenticated users can manage checklist items"
  on checklist_items for all to authenticated
  using (true);

create table if not exists inspection_items (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  item_id       uuid not null references checklist_items(id),
  status        text not null check (status in ('pass', 'warning', 'fail')),
  photo_url     text,
  notes         text
);

alter table inspection_items enable row level security;

create policy "Authenticated users can read inspection items"
  on inspection_items for select to authenticated
  using (true);

create policy "Authenticated users can insert inspection items"
  on inspection_items for insert to authenticated
  with check (true);

create table if not exists inspections (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id),
  inspector_email text not null,
  submitted_at    timestamptz not null default now(),
  pdf_url         text
);

alter table inspections enable row level security;

create policy "Authenticated users can read inspections"
  on inspections for select to authenticated
  using (true);

create policy "Authenticated users can insert inspections"
  on inspections for insert to authenticated
  with check (true);

create policy "Authenticated users can update inspections"
  on inspections for update to authenticated
  using (true);

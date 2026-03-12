create table if not exists stores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  report_emails text[] not null default '{}',
  warning_emails text[] not null default '{}',
  overdue_days  integer not null default 7,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table stores enable row level security;

create policy "Authenticated users can read active stores"
  on stores for select to authenticated
  using (active = true);

create policy "Authenticated users can manage stores"
  on stores for all to authenticated
  using (true);

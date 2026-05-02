-- PROFILES TABLE
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  address text,
  area text,
  disco text default 'AEDC',
  service_band text default 'A',
  meter_number text,
  account_number text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- OUTAGES TABLE
create table outages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time,
  duration_minutes integer,
  notes text,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table outages enable row level security;
create policy "Users can view own outages" on outages for select using (auth.uid() = user_id);
create policy "Users can insert own outages" on outages for insert with check (auth.uid() = user_id);
create policy "Users can update own outages" on outages for update using (auth.uid() = user_id);
create policy "Users can delete own outages" on outages for delete using (auth.uid() = user_id);

-- AUTO-UPDATE updated_at TRIGGER
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger outages_updated_at
before update on outages
for each row execute function update_updated_at();

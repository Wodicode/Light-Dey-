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

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN STATS FUNCTION
-- Protected server-side: only users with is_admin=true in app_metadata can call it.
-- To grant yourself admin access:
--   Supabase dashboard → Authentication → Users → click your user
--   → Edit → App Metadata → paste: {"is_admin": true} → Save
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function get_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reject anyone without is_admin=true in their JWT app_metadata
  if not coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  ) then
    raise exception 'Unauthorized: admin access only';
  end if;

  return json_build_object(
    -- Totals
    'total_users',    (select count(*)::int from auth.users),
    'total_outages',  (select count(*)::int from outages),
    'active_outages', (select count(*)::int from outages where is_active = true),
    'total_profiles', (select count(*)::int from profiles),

    -- Signups per day — last 30 days
    'signups_by_day', (
      select coalesce(json_agg(
        json_build_object('day', day::text, 'count', cnt)
        order by day
      ), '[]'::json)
      from (
        select created_at::date as day, count(*)::int as cnt
        from auth.users
        where created_at >= now() - interval '30 days'
        group by created_at::date
        order by created_at::date
      ) t
    ),

    -- Outages logged per day — last 30 days
    'outages_by_day', (
      select coalesce(json_agg(
        json_build_object('day', day::text, 'count', cnt)
        order by day
      ), '[]'::json)
      from (
        select date::date as day, count(*)::int as cnt
        from outages
        where created_at >= now() - interval '30 days'
        group by date::date
        order by date::date
      ) t
    ),

    -- DisCo breakdown
    'disco_distribution', (
      select coalesce(json_agg(
        json_build_object('name', disco, 'value', cnt)
        order by cnt desc
      ), '[]'::json)
      from (
        select coalesce(disco, 'Unknown') as disco, count(*)::int as cnt
        from profiles
        group by disco
        order by cnt desc
      ) t
    ),

    -- Service band breakdown
    'band_distribution', (
      select coalesce(json_agg(
        json_build_object('name', 'Band ' || service_band, 'value', cnt)
        order by service_band
      ), '[]'::json)
      from (
        select coalesce(service_band, '?') as service_band, count(*)::int as cnt
        from profiles
        group by service_band
        order by service_band
      ) t
    ),

    -- Top 10 areas by user count
    'top_areas', (
      select coalesce(json_agg(
        json_build_object('area', area, 'count', cnt)
        order by cnt desc
      ), '[]'::json)
      from (
        select area, count(*)::int as cnt
        from profiles
        where area is not null and trim(area) != ''
        group by area
        order by cnt desc
        limit 10
      ) t
    ),

    -- Recent signups (last 10)
    'recent_users', (
      select coalesce(json_agg(
        json_build_object(
          'email', email,
          'created_at', created_at::text
        )
        order by created_at desc
      ), '[]'::json)
      from (
        select email, created_at
        from auth.users
        order by created_at desc
        limit 10
      ) t
    )
  );
end;
$$;

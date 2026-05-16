-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp Bot Schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add whatsapp_number column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Optional: index for fast lookups by phone number
CREATE INDEX IF NOT EXISTS profiles_whatsapp_number_idx ON profiles (whatsapp_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: start_outage_by_phone
--    Called by the WhatsApp bot when a user reports light-off.
--    Normalises the incoming phone number (strips leading + or country prefix
--    so we can match how numbers are stored in different formats).
--    Returns JSON: { success, outage_id, started_at } or { error }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_outage_by_phone(p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised    text;
  v_user_id       uuid;
  v_outage_id     uuid;
  v_started_at    timestamptz;
  v_existing_id   uuid;
BEGIN
  -- Normalise: strip leading + so we can compare regardless of format stored
  v_normalised := regexp_replace(p_phone, '^\+', '');

  -- Find the profile whose whatsapp_number (normalised the same way) matches
  SELECT id INTO v_user_id
  FROM profiles
  WHERE regexp_replace(whatsapp_number, '^\+', '') = v_normalised
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'unregistered');
  END IF;

  -- Guard: is there already an active outage for this user?
  SELECT id INTO v_existing_id
  FROM outages
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT created_at INTO v_started_at
    FROM outages
    WHERE id = v_existing_id;

    RETURN json_build_object(
      'error',      'already_active',
      'outage_id',  v_existing_id,
      'started_at', v_started_at
    );
  END IF;

  -- Insert new active outage
  v_started_at := now();
  INSERT INTO outages (user_id, date, start_time, is_active)
  VALUES (
    v_user_id,
    (v_started_at AT TIME ZONE 'Africa/Lagos')::date,
    (v_started_at AT TIME ZONE 'Africa/Lagos')::time,
    true
  )
  RETURNING id INTO v_outage_id;

  RETURN json_build_object(
    'success',    true,
    'outage_id',  v_outage_id,
    'started_at', v_started_at
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: end_outage_by_phone
--    Called by the WhatsApp bot when a user reports light-on.
--    Finds the active outage, closes it, calculates duration_minutes.
--    Returns JSON: { success, duration_minutes, duration_formatted } or { error }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION end_outage_by_phone(p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised      text;
  v_user_id         uuid;
  v_outage_id       uuid;
  v_started_at      timestamptz;
  v_ended_at        timestamptz;
  v_duration_mins   integer;
  v_hours           integer;
  v_mins            integer;
  v_formatted       text;
BEGIN
  v_normalised := regexp_replace(p_phone, '^\+', '');

  SELECT id INTO v_user_id
  FROM profiles
  WHERE regexp_replace(whatsapp_number, '^\+', '') = v_normalised
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'unregistered');
  END IF;

  -- Find the active outage
  SELECT id, created_at INTO v_outage_id, v_started_at
  FROM outages
  WHERE user_id = v_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_outage_id IS NULL THEN
    RETURN json_build_object('error', 'no_active_outage');
  END IF;

  v_ended_at      := now();
  v_duration_mins := GREATEST(1, EXTRACT(EPOCH FROM (v_ended_at - v_started_at))::integer / 60);

  UPDATE outages
  SET
    end_time         = (v_ended_at AT TIME ZONE 'Africa/Lagos')::time,
    duration_minutes = v_duration_mins,
    is_active        = false
  WHERE id = v_outage_id;

  -- Format: "2h 35m" or "45m"
  v_hours   := v_duration_mins / 60;
  v_mins    := v_duration_mins % 60;
  IF v_hours > 0 THEN
    v_formatted := v_hours::text || 'h ' || v_mins::text || 'm';
  ELSE
    v_formatted := v_mins::text || 'm';
  END IF;

  RETURN json_build_object(
    'success',            true,
    'outage_id',          v_outage_id,
    'duration_minutes',   v_duration_mins,
    'duration_formatted', v_formatted
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: get_active_outage_by_phone
--    Used by the "status" command. Returns the active outage for this phone
--    or null. Edge function can use this to avoid two round-trips.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_active_outage_by_phone(p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised    text;
  v_user_id       uuid;
  v_outage_id     uuid;
  v_started_at    timestamptz;
  v_elapsed_mins  integer;
  v_hours         integer;
  v_mins          integer;
  v_formatted     text;
BEGIN
  v_normalised := regexp_replace(p_phone, '^\+', '');

  SELECT id INTO v_user_id
  FROM profiles
  WHERE regexp_replace(whatsapp_number, '^\+', '') = v_normalised
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'unregistered');
  END IF;

  SELECT id, created_at INTO v_outage_id, v_started_at
  FROM outages
  WHERE user_id = v_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_outage_id IS NULL THEN
    RETURN json_build_object('active', false);
  END IF;

  v_elapsed_mins := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_started_at))::integer / 60);
  v_hours        := v_elapsed_mins / 60;
  v_mins         := v_elapsed_mins % 60;
  IF v_hours > 0 THEN
    v_formatted := v_hours::text || 'h ' || v_mins::text || 'm';
  ELSE
    v_formatted := v_mins::text || 'm';
  END IF;

  RETURN json_build_object(
    'active',            true,
    'outage_id',         v_outage_id,
    'started_at',        v_started_at,
    'elapsed_minutes',   v_elapsed_mins,
    'elapsed_formatted', v_formatted
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMUNITY FEATURES — run in Supabase SQL Editor after schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Add LGA + opt-in columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lga               text,
  ADD COLUMN IF NOT EXISTS community_opt_in  boolean DEFAULT false;

-- Anonymised, crowd-sourced daily outage reports.
-- One row per user per calendar date (UPSERT enforced).
CREATE TABLE IF NOT EXISTS community_reports (
  id              uuid      DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid      REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  report_date     date      NOT NULL,
  lga             text      NOT NULL,
  disco           text,
  service_band    text,
  outage_minutes  integer   NOT NULL DEFAULT 0,
  submitted_at    timestamptz DEFAULT now(),
  CONSTRAINT community_reports_user_date UNIQUE (user_id, report_date)
);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own rows
CREATE POLICY "community_reports_own" ON community_reports
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- get_community_stats(p_date)
-- Returns per-LGA aggregated stats for the given date.
-- SECURITY DEFINER so the aggregation runs as the function owner;
-- individual rows are never exposed to callers.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_community_stats(p_date date DEFAULT CURRENT_DATE - 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      json_agg(row_to_json(t) ORDER BY t.avg_supply_hours ASC),
      '[]'::json
    )
    FROM (
      SELECT
        lga,
        ROUND(AVG(outage_minutes))::int                           AS avg_outage_minutes,
        ROUND((24.0 * 60 - AVG(outage_minutes)) / 60.0, 1)       AS avg_supply_hours,
        COUNT(*)::int                                             AS reporter_count,
        MAX(outage_minutes)::int                                  AS max_outage_minutes
      FROM community_reports
      WHERE report_date = p_date
        AND lga IS NOT NULL
        AND trim(lga) <> ''
      GROUP BY lga
    ) t
  );
END;
$$;

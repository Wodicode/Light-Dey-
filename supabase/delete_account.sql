-- Run this in Supabase SQL Editor to enable the Delete Account feature.
-- All related rows (outages, profiles, community_reports, etc.) are removed
-- automatically via ON DELETE CASCADE on the auth.users foreign keys.

CREATE OR REPLACE FUNCTION delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

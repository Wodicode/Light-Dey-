-- ─────────────────────────────────────────────────────────────────────────────
-- SPEND TRACKER — run in Supabase SQL Editor
-- Requires update_updated_at() function from schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recharges (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid          REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recharge_date   date          NOT NULL,
  amount_naira    numeric(12,2) NOT NULL,
  kwh             numeric(8,2),
  token_number    text,
  notes           text,
  created_at      timestamptz   DEFAULT now(),
  updated_at      timestamptz   DEFAULT now()
);

ALTER TABLE recharges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recharges_own" ON recharges;
CREATE POLICY "recharges_own" ON recharges
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS recharges_updated_at ON recharges;
CREATE TRIGGER recharges_updated_at
  BEFORE UPDATE ON recharges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

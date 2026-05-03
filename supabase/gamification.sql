-- Run this in Supabase SQL Editor

-- Add complaints_filed counter to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS complaints_filed integer DEFAULT 0;

-- Daily "nothing today" confirmations to maintain logging streak
CREATE TABLE IF NOT EXISTS daily_confirmations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "confirmations_own" ON daily_confirmations;
CREATE POLICY "confirmations_own" ON daily_confirmations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

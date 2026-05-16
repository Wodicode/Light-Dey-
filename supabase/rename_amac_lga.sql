-- Run in Supabase SQL Editor to fix old LGA name data
UPDATE community_reports SET lga = 'AMAC' WHERE lga = 'AMAC (Garki/Wuse)';
UPDATE profiles            SET lga = 'AMAC' WHERE lga = 'AMAC (Garki/Wuse)';

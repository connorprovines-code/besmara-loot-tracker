-- Database Constraints for Data Integrity
-- Run this SQL in your Supabase SQL editor BEFORE enabling real-time
-- These constraints prevent data corruption and negative gold scenarios

-- 1. Prevent negative gold on players
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_gold_positive;

ALTER TABLE players
  ADD CONSTRAINT players_gold_positive
  CHECK (gold >= 0);

-- 2. Prevent negative gold on party fund
ALTER TABLE party_fund
  DROP CONSTRAINT IF EXISTS party_fund_gold_positive;

ALTER TABLE party_fund
  ADD CONSTRAINT party_fund_gold_positive
  CHECK (gold >= 0);

-- 3. Enable Realtime on all tables
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE party_fund;
ALTER PUBLICATION supabase_realtime ADD TABLE crew;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Note: If you get an error about publication not existing, run this first:
-- CREATE PUBLICATION supabase_realtime;
-- Then run the ALTER PUBLICATION commands above

-- 4. Add indexes for better real-time performance
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_assigned_to_idx ON items(assigned_to);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);

-- Verify constraints are active
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('players_gold_positive', 'party_fund_gold_positive');

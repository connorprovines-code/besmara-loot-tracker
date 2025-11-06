-- Database setup for Besmara's Loot Tracker
-- Run this SQL in your Supabase SQL editor

-- Create crew table to store crew counts by level
CREATE TABLE IF NOT EXISTS crew (
  id BIGSERIAL PRIMARY KEY,
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial crew record if it doesn't exist
INSERT INTO crew (counts)
SELECT '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM crew LIMIT 1);

-- Enable Row Level Security (RLS)
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on crew" ON crew
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crew_updated_at
  BEFORE UPDATE ON crew
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

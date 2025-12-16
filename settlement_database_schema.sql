-- Settlement Management System for Pathfinder 1e
-- Supports building progression, BP economy, and production cycles

-- Settlement table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  build_points DECIMAL(10,2) DEFAULT 0,
  population INTEGER DEFAULT 0,
  labor_available INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, name)
);

-- Building definitions table (template data)
CREATE TABLE IF NOT EXISTS building_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_type TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'producer' or 'facility'
  name TEXT NOT NULL,
  description TEXT,
  tier_data JSONB NOT NULL, -- Array of tier objects with costs, production, labor
  max_tier INTEGER DEFAULT 4,
  base_tier INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlement buildings table (actual building instances)
CREATE TABLE IF NOT EXISTS settlement_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL REFERENCES building_definitions(building_type),
  tier INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- 'active', 'constructing', 'upgrading'
  construction_weeks_total INTEGER DEFAULT 0,
  construction_weeks_remaining INTEGER DEFAULT 0,
  stats JSONB, -- Current tier stats (bpCost, production, laborCost, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production cycles table
CREATE TABLE IF NOT EXISTS production_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  weeks_remaining INTEGER DEFAULT 4,
  total_production DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(settlement_id, cycle_number)
);

-- Insert building definitions with balanced costs and production
-- Producer buildings: BP costs 1/3/6/12, Production 1/1.5/3/6 (24 BP/month total for 4 buildings)
INSERT INTO building_definitions (building_type, category, name, description, tier_data, max_tier, base_tier)
VALUES
  -- PRODUCER BUILDINGS
  ('lumber_mill', 'producer', 'Lumber Mill', 'Timber production facility generating build points',
    '[
      {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
      {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
      {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
      {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
    ]'::jsonb, 4, 1),

  ('quarry', 'producer', 'Quarry', 'Stone quarry producing build points',
    '[
      {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
      {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
      {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
      {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
    ]'::jsonb, 4, 1),

  ('crab_processing', 'producer', 'Crab Processing', 'Crab harvesting and processing facility',
    '[
      {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
      {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
      {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
      {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
    ]'::jsonb, 4, 1),

  ('dinosaur_ranch', 'producer', 'Dinosaur Ranch', 'Exotic beast breeding and training facility',
    '[
      {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
      {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
      {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
      {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
    ]'::jsonb, 4, 1),

  -- FACILITY BUILDINGS (labor cost = tier)
  ('barracks', 'facility', 'Barracks', 'Military housing and training facility',
    '[
      {"tier": 1, "bpCost": 6, "constructionWeeks": 4, "laborCost": 1, "defense": 1},
      {"tier": 2, "bpCost": 12, "constructionWeeks": 8, "laborCost": 2, "defense": 2},
      {"tier": 3, "bpCost": 18, "constructionWeeks": 12, "laborCost": 3, "defense": 4},
      {"tier": 4, "bpCost": 24, "constructionWeeks": 16, "laborCost": 4, "defense": 6}
    ]'::jsonb, 4, 1),

  ('warehouse', 'facility', 'Warehouse', 'Storage facility for goods and materials',
    '[
      {"tier": 1, "bpCost": 4, "constructionWeeks": 3, "laborCost": 1, "storage": 100},
      {"tier": 2, "bpCost": 8, "constructionWeeks": 6, "laborCost": 2, "storage": 250},
      {"tier": 3, "bpCost": 12, "constructionWeeks": 9, "laborCost": 3, "storage": 500},
      {"tier": 4, "bpCost": 16, "constructionWeeks": 12, "laborCost": 4, "storage": 1000}
    ]'::jsonb, 4, 1),

  ('smithy', 'facility', 'Smithy', 'Blacksmith and metalworking facility',
    '[
      {"tier": 1, "bpCost": 5, "constructionWeeks": 3, "laborCost": 1, "craftBonus": 2},
      {"tier": 2, "bpCost": 10, "constructionWeeks": 6, "laborCost": 2, "craftBonus": 4},
      {"tier": 3, "bpCost": 15, "constructionWeeks": 9, "laborCost": 3, "craftBonus": 6},
      {"tier": 4, "bpCost": 20, "constructionWeeks": 12, "laborCost": 4, "craftBonus": 8}
    ]'::jsonb, 4, 1),

  ('market', 'facility', 'Market', 'Trading center for commerce',
    '[
      {"tier": 1, "bpCost": 8, "constructionWeeks": 4, "laborCost": 1, "economy": 2},
      {"tier": 2, "bpCost": 16, "constructionWeeks": 8, "laborCost": 2, "economy": 4},
      {"tier": 3, "bpCost": 24, "constructionWeeks": 12, "laborCost": 3, "economy": 6},
      {"tier": 4, "bpCost": 32, "constructionWeeks": 16, "laborCost": 4, "economy": 8}
    ]'::jsonb, 4, 1),

  ('tavern', 'facility', 'Tavern', 'Public house for food, drink and lodging',
    '[
      {"tier": 1, "bpCost": 3, "constructionWeeks": 2, "laborCost": 1, "loyalty": 1},
      {"tier": 2, "bpCost": 6, "constructionWeeks": 4, "laborCost": 2, "loyalty": 2},
      {"tier": 3, "bpCost": 9, "constructionWeeks": 6, "laborCost": 3, "loyalty": 3},
      {"tier": 4, "bpCost": 12, "constructionWeeks": 8, "laborCost": 4, "loyalty": 4}
    ]'::jsonb, 4, 1),

  ('temple', 'facility', 'Temple', 'Religious structure providing spiritual services',
    '[
      {"tier": 1, "bpCost": 10, "constructionWeeks": 6, "laborCost": 1, "stability": 2},
      {"tier": 2, "bpCost": 20, "constructionWeeks": 12, "laborCost": 2, "stability": 4},
      {"tier": 3, "bpCost": 30, "constructionWeeks": 18, "laborCost": 3, "stability": 6},
      {"tier": 4, "bpCost": 40, "constructionWeeks": 24, "laborCost": 4, "stability": 8}
    ]'::jsonb, 4, 1),

  ('library', 'facility', 'Library', 'Repository of knowledge and learning',
    '[
      {"tier": 1, "bpCost": 6, "constructionWeeks": 4, "laborCost": 1, "knowledgeBonus": 2},
      {"tier": 2, "bpCost": 12, "constructionWeeks": 8, "laborCost": 2, "knowledgeBonus": 4},
      {"tier": 3, "bpCost": 18, "constructionWeeks": 12, "laborCost": 3, "knowledgeBonus": 6},
      {"tier": 4, "bpCost": 24, "constructionWeeks": 16, "laborCost": 4, "knowledgeBonus": 8}
    ]'::jsonb, 4, 1),

  ('wall', 'facility', 'Wall', 'Defensive fortification',
    '[
      {"tier": 1, "bpCost": 8, "constructionWeeks": 6, "laborCost": 1, "defense": 2},
      {"tier": 2, "bpCost": 16, "constructionWeeks": 12, "laborCost": 2, "defense": 4},
      {"tier": 3, "bpCost": 24, "constructionWeeks": 18, "laborCost": 3, "defense": 6},
      {"tier": 4, "bpCost": 32, "constructionWeeks": 24, "laborCost": 4, "defense": 8}
    ]'::jsonb, 4, 1)

ON CONFLICT (building_type) DO UPDATE SET
  tier_data = EXCLUDED.tier_data,
  description = EXCLUDED.description,
  name = EXCLUDED.name;

-- Enable Row Level Security
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settlements
CREATE POLICY "Users can view settlements in their campaigns"
  ON settlements FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
      UNION
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage settlements in their campaigns"
  ON settlements FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for settlement_buildings
CREATE POLICY "Users can view buildings in their settlements"
  ON settlement_buildings FOR SELECT
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      WHERE s.campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
        UNION
        SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage buildings in their settlements"
  ON settlement_buildings FOR ALL
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      WHERE s.campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for production_cycles
CREATE POLICY "Users can view production cycles in their settlements"
  ON production_cycles FOR SELECT
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      WHERE s.campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
        UNION
        SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage production cycles in their settlements"
  ON production_cycles FOR ALL
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      WHERE s.campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlements_campaign ON settlements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_settlement_buildings_settlement ON settlement_buildings(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_buildings_type ON settlement_buildings(building_type);
CREATE INDEX IF NOT EXISTS idx_production_cycles_settlement ON production_cycles(settlement_id);
CREATE INDEX IF NOT EXISTS idx_production_cycles_active ON production_cycles(settlement_id, is_active);

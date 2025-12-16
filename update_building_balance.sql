-- Migration script to update building balance for existing settlements
-- Updates producer building costs from 4/8/16/32 to 1/3/6/12
-- Updates producer building production from 1/2/4/8 to 1/1.5/3/6
-- Updates non-producer building labor costs to equal tier number

-- Update Lumber Mill
UPDATE building_definitions
SET tier_data = '[
  {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
  {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
  {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
  {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
]'::jsonb
WHERE building_type = 'lumber_mill';

-- Update Quarry
UPDATE building_definitions
SET tier_data = '[
  {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
  {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
  {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
  {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
]'::jsonb
WHERE building_type = 'quarry';

-- Update Crab Processing
UPDATE building_definitions
SET tier_data = '[
  {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
  {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
  {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
  {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
]'::jsonb
WHERE building_type = 'crab_processing';

-- Update Dinosaur Ranch
UPDATE building_definitions
SET tier_data = '[
  {"tier": 1, "bpCost": 1, "constructionWeeks": 2, "production": 1.0, "laborCost": 10},
  {"tier": 2, "bpCost": 3, "constructionWeeks": 4, "production": 1.5, "laborCost": 15},
  {"tier": 3, "bpCost": 6, "constructionWeeks": 8, "production": 3.0, "laborCost": 20},
  {"tier": 4, "bpCost": 12, "constructionWeeks": 16, "production": 6.0, "laborCost": 30}
]'::jsonb
WHERE building_type = 'dinosaur_ranch';

-- Update Barracks (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'barracks';

-- Update Warehouse (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'warehouse';

-- Update Smithy (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'smithy';

-- Update Market (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'market';

-- Update Tavern (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'tavern';

-- Update Temple (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'temple';

-- Update Library (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'library';

-- Update Wall (labor cost = tier)
UPDATE building_definitions
SET tier_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(tier_data, '{0,laborCost}', '1'),
      '{1,laborCost}', '2'),
    '{2,laborCost}', '3'),
  '{3,laborCost}', '4')
WHERE building_type = 'wall';

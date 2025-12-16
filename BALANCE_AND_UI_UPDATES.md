# Settlement System Balance and UI Updates

## Overview
Major update to the settlement management system including balance changes, bug fixes, and UI improvements.

## Balance Changes

### Producer Buildings
**Previous Costs:** 4/8/16/32 BP for tiers 1-4
**New Costs:** 1/3/6/12 BP for tiers 1-4
**Change:** ~62.5% cost reduction

**Previous Production:** 1/2/4/8 BP per cycle (doubling progression)
**New Production:** 1/1.5/3/6 BP per cycle (50% reduction at higher tiers)
**Total Monthly Production:** 24 BP (4 buildings at tier 4 = 6+6+6+6 over 4 weeks)

#### Affected Buildings
- Lumber Mill
- Quarry
- Crab Processing
- Dinosaur Ranch

### Non-Producer Buildings
**Labor Cost Update:** All non-producer buildings now have labor cost equal to their tier number.

**Before:**
- Variable labor costs across buildings
- Inconsistent progression

**After:**
- Tier 1: 1 labor
- Tier 2: 2 labor
- Tier 3: 3 labor
- Tier 4: 4 labor

#### Affected Buildings
- Barracks
- Warehouse
- Smithy
- Market
- Tavern
- Temple
- Library
- Wall

## Bug Fixes

### Upgraded Buildings Not Applying Stats
**Issue:** When buildings were upgraded, the tier would change but the stats (production, bonuses, etc.) would remain at the old tier's values.

**Root Cause:** The `confirmUpgrade` function was setting the building to "upgrading" status but not updating the tier and stats until construction completed.

**Fix:** Modified the upgrade logic to set both `tier` and `stats` immediately when the upgrade begins:
```javascript
await supabase
  .from('settlement_buildings')
  .update({
    status: 'upgrading',
    tier: building.tier + 1,  // Set tier now
    construction_weeks_total: upgradeWeeks,
    construction_weeks_remaining: upgradeWeeks,
    stats: nextTierData  // Set stats now
  })
  .eq('id', building.id);
```

## UI Improvements

### Replaced Browser Modals with Custom Dark Theme Modals
**Issue:** All `alert()` and `prompt()` calls were using browser's white modals that broke the dark theme immersion.

**Solution:** Implemented custom modal system matching the loot tracker's dark theme:
- Gold Transfer Modal
- Buy BP Modal
- Cash Out BP Modal
- New Settlement Modal
- Buy Building Modal

**Features:**
- Dark slate background with cyan accents
- Consistent with existing UI
- Keyboard support (Enter to confirm, Escape handled by clicking Cancel)
- Proper input validation

### Toast Notification System
Replaced all `alert()` calls with a custom notification toast:
- Auto-dismisses after 5 seconds
- Fixed position (bottom-right)
- Dark theme with cyan border
- Info icon for visual consistency
- Non-blocking (doesn't halt execution)

## Migration Instructions

### For New Setups
Simply run `settlement_database_schema.sql` to create all tables with the correct balance values.

### For Existing Databases
1. Run `update_building_balance.sql` to update existing building definitions
2. Existing buildings will need to be manually reviewed if they were purchased under old balance
3. Consider compensating players with BP difference if needed

## Testing Checklist

- [ ] Create new settlement
- [ ] Buy tier 1 producer building (should cost 1 BP)
- [ ] Upgrade producer to tier 2 (should cost 3 BP, produce 1.5 BP/cycle)
- [ ] Verify production works correctly
- [ ] Buy non-producer building and verify labor cost equals tier
- [ ] Upgrade non-producer building and verify labor cost increases with tier
- [ ] Advance weeks and verify production cycle completes correctly
- [ ] Test all modals (Transfer Gold, Buy BP, Cash Out, etc.)
- [ ] Verify notifications show and auto-dismiss
- [ ] Test building upgrade stats bug fix
- [ ] Verify real-time updates work across multiple clients

## Technical Details

### Database Schema
- `settlements` table: Stores settlement data (BP, population, labor)
- `building_definitions` table: Template data for all building types
- `settlement_buildings` table: Actual building instances
- `production_cycles` table: Tracks 4-week production cycles

### React Component
- Uses React hooks (useState, useEffect)
- Real-time subscriptions via Supabase channels
- Custom modal system with state management
- Toast notification system with auto-dismiss
- Full CRUD operations for settlements and buildings

### Icons Used
- Building2: General facilities
- TrendingUp: Producer buildings
- Coins: Gold/BP related actions
- Users: Population
- Hammer: Labor
- ScrollText: Production cycles (replaced History icon)
- Info: Notifications
- Plus: Add/Create actions
- ArrowUp: Upgrade actions

## Notes
- Icon change: `History` → `ScrollText` for production cycle display
- Icon change: `Swords` → `Sword` for single weapon icon consistency
- All browser alerts and prompts have been eliminated
- System is fully integrated with Supabase real-time features
- Labor costs are now consistent and predictable across all building types

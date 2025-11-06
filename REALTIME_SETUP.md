# Real-Time Collaboration Setup

## Overview
Your Besmara's Loot Tracker now supports **real-time collaboration**! Multiple users can work simultaneously and see each other's changes instantly.

---

## ⚠️ IMPORTANT: Database Setup Required

Before the real-time features will work, you **MUST** run the setup SQL in your Supabase database.

### Step 1: Add Database Constraints (CRITICAL)
These constraints protect your data from corruption:

1. Go to https://supabase.com/dashboard/project/jmfprjdvgtjlztjtfkhh
2. Click **SQL Editor** in the left sidebar
3. Copy and paste the contents of `database_constraints.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify you see "Success" message

**What this does:**
- ✅ Prevents negative gold balances
- ✅ Enables real-time subscriptions on all tables
- ✅ Adds performance indexes
- ✅ Protects data integrity

---

## What's Real-Time?

### ✅ Updates Instantly Across All Users:
- **Items**: When someone adds, assigns, sells, or transfers an item
- **Gold**: When any player's or party fund gold changes
- **Crew**: When crew counts are adjusted
- **Transactions**: When wages are paid or gold is distributed
- **Inventories**: When items move between players

### How It Works:
```
User A adds an item → Database updates → User B & C see it instantly
User B pays wages → Database updates → User A & C see gold change instantly
User C assigns item → Database updates → User A & B see inventory update instantly
```

---

## Features

### Phase 1: Basic Real-Time (✅ Implemented)
- New items appear immediately for everyone
- Gold balance updates sync instantly
- Transaction log updates in real-time
- Crew count changes visible to all users

### Phase 2: Full Synchronization (✅ Implemented)
- Item status changes (assigned, sold, depleted) sync across all users
- Inventory updates when items are transferred
- Automatic duplicate prevention
- Smart state merging

---

## Kill Switch

If you need to disable real-time for any reason:

1. Open `src/App.jsx`
2. Find this line (around line 37):
   ```javascript
   const ENABLE_REALTIME = true;
   ```
3. Change it to:
   ```javascript
   const ENABLE_REALTIME = false;
   ```
4. Save the file

**The app will work exactly as before, requiring manual refresh to see changes.**

---

## How to Test It

### Testing Real-Time (Multi-User):
1. Open the app in two different browsers (or one normal + one incognito)
2. In Browser A: Add an item to Incoming Loot
3. In Browser B: Watch it appear automatically!
4. In Browser A: Assign the item to a player
5. In Browser B: See it move to that player's inventory
6. Try adjusting crew counts, paying wages, etc.

### Console Logs:
Open your browser's developer console (F12) to see real-time events:
```
🔴 Setting up real-time subscriptions...
✅ Real-time subscriptions active!
📦 New item added: { name: "Longsword +1", ... }
💰 Player gold updated: { name: "Torvin", gold: 500 }
👥 Crew updated: { 1: 10, 2: 5, ... }
```

---

## Safety Features

### 1. Database Constraints
- ❌ Gold can never go negative
- ❌ Items can't be in two inventories at once
- ✅ All operations are atomic (all-or-nothing)

### 2. Duplicate Prevention
- Real-time subscriptions check for existing items before adding
- Prevents double-insertions if multiple tabs are open

### 3. Error Handling
- If a real-time update fails, it doesn't crash the app
- Errors are logged to console for debugging
- Database rollback on failed transactions

### 4. Optimistic UI
- Your actions show immediately (feels instant)
- If operation fails, UI reverts automatically
- Backend validation ensures data integrity

---

## Potential Edge Cases

### Scenario: Two Users Assign Same Item Simultaneously
**What happens:**
- First request succeeds
- Second request fails (item already assigned)
- Second user sees item disappear (it went to first user)
- Transaction log shows who got it

**Solution:** Database prevents double-assignment. No data corruption.

### Scenario: Two Users Try to Buy With Insufficient Gold
**What happens:**
- First request succeeds and deducts gold
- Second user's UI updates to show new gold amount
- Second request fails with "Insufficient gold" error
- Database constraint prevents negative gold

**Solution:** Real-time gold updates + database constraints prevent this.

### Scenario: Someone Deletes Item While You're Looking At It
**What happens:**
- Item disappears from your screen immediately
- Any open modal closes or shows error
- No data loss

**Solution:** Real-time sync keeps everyone in sync.

---

## Performance

### Bandwidth Usage:
- Minimal: Only change notifications (not full data)
- ~1-5 KB per update
- WebSocket connection stays open (low overhead)

### Free Tier Limits:
- 200 concurrent connections (plenty for your use case)
- 2GB bandwidth/month
- Should handle 3-10 active users easily

### Latency:
- Local updates: Instant (optimistic UI)
- Remote updates: ~50-200ms depending on internet

---

## Troubleshooting

### Real-Time Not Working?

**Check 1: Did you run the SQL?**
```sql
-- Run this in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE party_fund;
ALTER PUBLICATION supabase_realtime ADD TABLE crew;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

**Check 2: Is the kill switch enabled?**
- Open `src/App.jsx` and verify `ENABLE_REALTIME = true`

**Check 3: Console errors?**
- Press F12 and check the Console tab
- Look for errors related to Supabase or subscriptions

**Check 4: Supabase Realtime enabled?**
- Go to your Supabase project settings
- Navigate to Database → Replication
- Verify Realtime is enabled

### Common Issues:

**"Policy violation" errors:**
- Check your Row Level Security policies in Supabase
- Ensure policies allow SELECT for all users

**Updates not syncing:**
- Verify tables are added to the `supabase_realtime` publication
- Check browser console for connection errors

**"Cannot read property of undefined":**
- Refresh the page to reload all data
- Check that all tables have the required columns

---

## Technical Details

### Architecture:
```
User Action → Database Write → Postgres Triggers →
Supabase Realtime → WebSocket → All Connected Clients → State Update
```

### Subscriptions:
- 5 separate channels (items, players, party_fund, crew, transactions)
- Each channel listens for INSERT, UPDATE, DELETE events
- Automatic reconnection on disconnect
- Cleanup on component unmount

### State Management:
- React useState for local state
- Real-time callbacks update state directly
- No external state library needed
- Efficient re-renders (only affected components update)

---

## Cost Implications

### Current (Without Real-Time):
- Free tier: Works fine

### With Real-Time:
- Free tier: Still works fine for 2-10 active users
- Pro tier ($25/month): Needed if >50 concurrent connections

**Recommendation:** Stick with free tier, you're nowhere near the limits!

---

## Rollback Plan

If anything goes wrong:

### Option 1: Disable Kill Switch
1. Set `ENABLE_REALTIME = false` in App.jsx
2. Commit and push
3. App works as before (requires manual refresh)

### Option 2: Revert Git Commit
```bash
git log  # Find the commit before real-time
git revert <commit-hash>
git push
```

### Option 3: Restore From Backup
- Supabase automatically backs up your database
- Can restore from any point in time

---

## Next Steps (Future Enhancements)

Want to go even further? Here are Phase 3 ideas:

### 🔮 Phase 3: Advanced Features (Not Implemented Yet)
- **Presence**: See who else is online
- **Cursors**: See what others are looking at
- **Undo/Redo**: Collaborative undo stack
- **Offline Support**: Queue actions when offline
- **Conflict UI**: Visual indicators for conflicting edits

Let me know if you want any of these!

---

## Questions?

**Q: Can I use this with 50 people?**
A: Yes, but you'll need Supabase Pro ($25/month) for more connections.

**Q: What if two people edit gold at the exact same time?**
A: Database constraints prevent invalid states. Last write wins, but constraints ensure gold never goes negative.

**Q: Does this work offline?**
A: Not yet. If you lose connection, you'll need to refresh. Phase 3 could add offline support.

**Q: Can I see who made what change?**
A: Not currently. Would need to add user authentication + audit logging.

**Q: Is my data safe?**
A: Yes! Database constraints prevent corruption, and all changes are atomic. Supabase also auto-backs up daily.

---

## Summary

✅ **Real-time collaboration is ready to use!**
✅ **Just run the SQL in `database_constraints.sql` first**
✅ **Kill switch available if needed**
✅ **Your data is protected by database constraints**
✅ **Works great for 2-10 simultaneous users**

Enjoy your magical real-time pirate loot tracker! 🏴‍☠️⚔️💰

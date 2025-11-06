# Crew Management Feature

## Overview
The Crew Management feature allows you to track your ship's crew by level (1-10) and automatically calculate monthly wages based on Pathfinder 1e rules.

## How to Use

### 1. Database Setup
Before using the Crew feature, you need to create the `crew` table in your Supabase database:

1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Run the SQL commands in `database_setup.sql`

### 2. Managing Crew
1. Navigate to the **Crew** tab (between "Gold Tracking" and "Master Log")
2. For each crew level (1-10), use the + and - buttons to adjust the number of crew members
3. The display shows:
   - Level number (1-10) - this is static and represents crew member level/HD
   - Current count of crew at that level (adjustable)
   - Cost per crew member (salary + food & drink)
   - Total cost for all crew at that level

### 3. Paying Wages
1. Click the **Pay Wages** button at the top of the Crew tab
2. Review the breakdown showing:
   - Current Party Fund balance
   - Total wages due
   - Remaining balance after payment
   - Detailed breakdown by crew level
3. (Optional) Add notes about the payment (e.g., "Monthly wages for Flamerule")
4. Click **Pay Wages** to confirm
5. The cost will be deducted from the Party Fund and logged in Gold Tracking

## Wage Calculation Formula

The wage formula is: **Salary = (5gp × Level)² per month**

Plus an additional **9 gp per crew member** for food and drink.

### Example Costs:
- Level 1: 25 gp + 9 gp = 34 gp/crew/month
- Level 2: 100 gp + 9 gp = 109 gp/crew/month
- Level 3: 225 gp + 9 gp = 234 gp/crew/month
- Level 4: 400 gp + 9 gp = 409 gp/crew/month
- Level 5: 625 gp + 9 gp = 634 gp/crew/month
- Level 6: 900 gp + 9 gp = 909 gp/crew/month
- Level 7: 1,225 gp + 9 gp = 1,234 gp/crew/month
- Level 8: 1,600 gp + 9 gp = 1,609 gp/crew/month
- Level 9: 2,025 gp + 9 gp = 2,034 gp/crew/month
- Level 10: 2,500 gp + 9 gp = 2,509 gp/crew/month

## Features
- ✅ Track crew by level (1-10)
- ✅ Automatic wage calculation based on Pathfinder rules
- ✅ Pay wages directly from Party Fund
- ✅ Transaction logging in Gold Tracking
- ✅ Optional notes for wage payments
- ✅ Real-time cost calculation
- ✅ Persistent storage in database

## Technical Details
- Crew counts are stored as JSONB in the `crew` table
- Wage payments are logged as transactions with type 'wages'
- All gold deductions go through the Party Fund
- Crew data is automatically saved when counts are updated

# Manual Database Setup Instructions

Since we cannot execute raw SQL via the Supabase client, you'll need to run the SQL scripts through the Supabase Dashboard SQL Editor.

## Steps:

### 1. Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/adxoysrelcqvzzrqmulv

### 2. Open SQL Editor
Navigate to: SQL Editor (in the left sidebar)

### 3. Run Migration Script
1. Click "New Query"
2. Copy the entire contents of `database/migrate-services-system.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Cmd/Ctrl + Enter
5. Wait for completion (should show "Success")

### 4. Run Data Population Script
1. Click "New Query" again
2. Copy the entire contents of `database/populate-services-data.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Cmd/Ctrl + Enter
5. Wait for completion (this may take a moment as it inserts lots of data)

### 5. Verify Success
Run this query to check everything worked:

```sql
SELECT
  (SELECT COUNT(*) FROM service_categories) as categories,
  (SELECT COUNT(*) FROM services) as services,
  (SELECT COUNT(*) FROM service_pricing) as pricing_entries,
  (SELECT COUNT(*) FROM add_ons) as add_ons,
  (SELECT COUNT(*) FROM service_add_ons) as service_addon_links;
```

You should see:
- 5 categories
- 13 services
- 50+ pricing entries
- 13 add-ons
- 30+ service-addon links

## What This Creates:

### Tables:
- `service_categories` - Categories like "Valeting Services", "Paint Correction", etc.
- `services` - All 13 services with full details
- `service_pricing` - Pricing for each service by vehicle size (Small, Medium, Large, XL)
- `add_ons` - All 13 add-ons with pricing
- `service_add_ons` - Which add-ons are available for which services

### Key Features:
- Every service has a unique UUID
- Every add-on has a unique UUID
- Pricing varies by vehicle size
- Add-ons are linked only to relevant services
- All data matches the Detail Dynamics pricing guide exactly

## After Running:
Once complete, come back to the terminal and I'll update the TypeScript types and build the services management UI.

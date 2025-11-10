# Run Services Migration - 2 Minute Task

## Step 1: Open Supabase SQL Editor
Visit: https://supabase.com/dashboard/project/adxoysrelcqvzzrqmulv/sql/new

## Step 2: Run Schema Migration

1. Click "New Query"
2. Copy ALL contents from: `database/migrate-services-system.sql`
3. Paste into the editor
4. Click "Run" (or Cmd+Enter)
5. Wait for "Success" message

## Step 3: Run Data Population

1. Click "New Query" again
2. Copy ALL contents from: `database/populate-services-data.sql`
3. Paste into the editor
4. Click "Run" (or Cmd+Enter)
5. Wait for completion (may take 10-15 seconds)

## Step 4: Verify (Optional)

Run this query in a new tab:
```sql
SELECT
  (SELECT COUNT(*) FROM service_categories) as categories,
  (SELECT COUNT(*) FROM services) as services,
  (SELECT COUNT(*) FROM service_pricing) as pricing_entries,
  (SELECT COUNT(*) FROM add_ons) as add_ons,
  (SELECT COUNT(*) FROM service_add_ons) as service_addon_links;
```

Expected results:
- 5 categories
- 13 services
- 52 pricing entries
- 13 add-ons
- 36+ service-addon links

## Done!

Once you see "Success" on both queries, return here and let me know. I'll then:
1. Update TypeScript types
2. Build the services management UI
3. Add add-on selection to job booking

---

**Why can't this run automatically?**
Supabase requires either:
- Running SQL via their Dashboard (most reliable)
- Direct PostgreSQL connection with specific credentials
- A custom RPC function we'd need to create first

The dashboard approach is fastest and most reliable.

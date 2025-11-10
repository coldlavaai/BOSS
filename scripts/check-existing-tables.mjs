// Check what tables exist in Supabase
// Run with: node scripts/check-existing-tables.mjs

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Checking existing tables in Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Query to get all tables in public schema
const { data, error } = await supabase.rpc('', {
  query: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
})

// Alternative: Try to query known table names
const tablesToCheck = [
  'clients', 'projects', 'time_entries',  // BOSS tables
  'customers', 'cars', 'jobs', 'services', 'add_ons', 'pipeline_stages'  // Detail Dynamics tables
]

console.log('Checking for existing tables:\n')

for (const table of tablesToCheck) {
  try {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true })

    if (!error) {
      console.log(`✓ ${table} exists`)
    }
  } catch (err) {
    // Table doesn't exist - that's fine
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('If you see Detail Dynamics tables (customers, cars, jobs, services):')
console.log('  → Need to drop them and run BOSS migration')
console.log('\nIf you see BOSS tables (clients, projects, time_entries):')
console.log('  → Already good to go!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

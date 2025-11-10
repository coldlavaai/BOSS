import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'supabase/migrations/003_seed_services.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log(data)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

runMigration()

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  console.log('📦 Reading migration file...')

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20250105_email_automation_system.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('🚀 Applying email automation system migration...')

  // Execute the migration SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // If the RPC doesn't exist, we'll need to execute it differently
    // Try using the REST API directly
    console.log('⚠️  exec_sql RPC not found, executing via connection...')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Executing ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      if (!statement) continue

      try {
        // Use raw SQL query
        const { error: queryError } = await supabase.rpc('exec', {
          query: statement + ';'
        })

        if (queryError) {
          console.error(`❌ Error in statement ${i + 1}:`, queryError.message)
          console.error('Statement:', statement.substring(0, 100) + '...')

          // Continue with other statements
          if (!queryError.message.includes('already exists')) {
            throw queryError
          } else {
            console.log(`⚠️  Skipping (already exists): ${statement.substring(0, 50)}...`)
          }
        } else {
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
        }
      } catch (err: any) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message)
        console.error('Statement:', statement.substring(0, 100) + '...')

        // Skip "already exists" errors
        if (!err.message?.includes('already exists')) {
          throw err
        }
      }
    }

    console.log('✅ Migration applied successfully!')
    return
  }

  console.log('✅ Migration applied successfully!')
}

applyMigration()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })

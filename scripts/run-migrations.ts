import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filename: string, sql: string) {
  console.log(`\nRunning migration: ${filename}`)

  try {
    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_string: statement })
        if (error) {
          // Try direct execution if RPC doesn't work
          console.log('Trying direct execution...')
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql_string: statement })
          })

          if (!response.ok) {
            throw new Error(`Failed to execute statement: ${await response.text()}`)
          }
        }
      }
    }

    console.log(`✓ Successfully ran ${filename}`)
  } catch (error: any) {
    console.error(`✗ Error running ${filename}:`, error.message)
    throw error
  }
}

async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

  const migrationFiles = [
    '20250105_email_automation_system.sql',
    '20250105_custom_variables.sql',
  ]

  console.log('Starting migrations...')

  for (const filename of migrationFiles) {
    const filepath = path.join(migrationsDir, filename)

    if (!fs.existsSync(filepath)) {
      console.log(`Skipping ${filename} (file not found)`)
      continue
    }

    const sql = fs.readFileSync(filepath, 'utf-8')
    await runMigration(filename, sql)
  }

  console.log('\n✓ All migrations completed successfully!')
}

main().catch((error) => {
  console.error('\n✗ Migration failed:', error)
  process.exit(1)
})

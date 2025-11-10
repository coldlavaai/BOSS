// Verify BOSS Migration Complete
// Run with: node scripts/verify-migration-complete.mjs

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verifying BOSS Migration...\n')

const supabase = createClient(supabaseUrl, supabaseKey)

const requiredTables = ['clients', 'projects', 'time_entries']
const results = []

for (const table of requiredTables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      results.push({ table, status: '❌', error: error.message })
    } else {
      results.push({ table, status: '✅', count: count || 0 })
    }
  } catch (err) {
    results.push({ table, status: '❌', error: err.message })
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('BOSS Database Tables:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

results.forEach(({ table, status, count, error }) => {
  if (error) {
    console.log(`${status} ${table.padEnd(20)} Error: ${error}`)
  } else {
    console.log(`${status} ${table.padEnd(20)} (${count} rows)`)
  }
})

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const allSuccess = results.every(r => r.status === '✅')

if (allSuccess) {
  console.log('✅ Session 1 COMPLETE!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('🎉 Database setup successful!')
  console.log('📋 All core tables created:')
  console.log('   • clients - CRM pipeline tracking')
  console.log('   • projects - Project management & profitability')
  console.log('   • time_entries - Time tracking with ADHD features')
  console.log('\n🚀 Ready for Session 2: Auth + Basic Layout')
  console.log('\n💾 Next: Commit your work to GitHub!')
} else {
  console.log('⚠️  Some tables are missing')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('Check the migration in Supabase SQL Editor.')
}

console.log('')

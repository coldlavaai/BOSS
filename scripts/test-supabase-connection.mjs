// Test Supabase Connection
// Run with: node scripts/test-supabase-connection.mjs

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Connection...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

console.log('✓ Environment variables loaded')
console.log('  URL:', supabaseUrl)
console.log('  Key:', supabaseKey.substring(0, 20) + '...\n')

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('✓ Supabase client created\n')

// Test 1: Check if we can connect
console.log('Test 1: Testing basic connection...')
try {
  const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true })

  if (error) {
    // Table might not exist yet - that's OK!
    if (error.code === '42P01') {
      console.log('⚠️  Table "clients" does not exist yet (expected before running migration)')
      console.log('   Next step: Run the migration in Supabase SQL Editor\n')
    } else {
      console.error('❌ Connection error:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✓ Connection successful!')
    console.log('  Clients table exists with', data, 'rows\n')
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message)
  process.exit(1)
}

// Test 2: Check auth
console.log('Test 2: Testing authentication...')
try {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('❌ Auth error:', error.message)
  } else {
    console.log('✓ Auth working (no session expected yet)\n')
  }
} catch (err) {
  console.error('❌ Auth test failed:', err.message)
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ Supabase connection test completed!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log('📋 Next Steps:')
console.log('1. Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0])
console.log('2. Click "SQL Editor" in sidebar')
console.log('3. Copy contents of database/01-boss-initial-schema.sql')
console.log('4. Paste and run in SQL Editor')
console.log('5. Re-run this test to verify tables created\n')

#!/usr/bin/env node
/**
 * One-time script to add first_name and last_name columns to customers table
 *
 * This uses PostgreSQL connection. To run:
 * 1. Get your database password from Supabase dashboard (Settings > Database > Connection string)
 * 2. Run: DB_PASSWORD=your_password node scripts/add-name-columns.js
 */

const { Client } = require('pg')

const projectRef = 'adxoysrelcqvzzrqmulv'
const dbPassword = process.env.DB_PASSWORD

if (!dbPassword) {
  console.error('❌ Error: DB_PASSWORD environment variable is required')
  console.log('\nTo get your database password:')
  console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/settings/database')
  console.log('2. Find the "Database password" or "Connection string"')
  console.log('3. Run: DB_PASSWORD=your_password node scripts/add-name-columns.js')
  process.exit(1)
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

async function addColumns() {
  const client = new Client({ connectionString })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected')

    console.log('\n📝 Adding first_name and last_name columns...')
    await client.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT;
    `)

    console.log('✅ Columns added successfully!')
    console.log('\n✨ You can now run: node scripts/migrate-customer-names.js')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

addColumns()

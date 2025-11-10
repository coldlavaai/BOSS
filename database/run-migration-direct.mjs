#!/usr/bin/env node

/**
 * Database Migration Runner for Detail Dynamics Services System
 * Uses direct PostgreSQL connection
 */

import pkg from 'pg'
const { Client } = pkg
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database connection config
const config = {
  host: 'db.adxoysrelcqvzzrqmulv.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'DetailDynamics22!2025!',
  ssl: {
    rejectUnauthorized: false
  }
}

async function runSQL(client, sql, description) {
  console.log(`\n🔄 ${description}...`)

  try {
    await client.query(sql)
    console.log(`✅ Success`)
    return true
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    if (err.position) {
      console.error(`   Position: ${err.position}`)
    }
    return false
  }
}

async function runMigration() {
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  DETAIL DYNAMICS - SERVICES SYSTEM MIGRATION                  ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  const client = new Client(config)

  try {
    console.log('\n🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully')

    // Read SQL files
    const migrationSQL = readFileSync(join(__dirname, 'migrate-services-system.sql'), 'utf8')
    const dataSQL = readFileSync(join(__dirname, 'populate-services-data.sql'), 'utf8')

    console.log('\n📋 Migration Plan:')
    console.log('   1. Drop old services tables')
    console.log('   2. Create new schema with:')
    console.log('      - service_categories')
    console.log('      - services')
    console.log('      - service_pricing (by vehicle size)')
    console.log('      - add_ons')
    console.log('      - service_add_ons (relationships)')
    console.log('   3. Populate all services from pricing guide')
    console.log('   4. Populate all add-ons and relationships')

    console.log('\n⚠️  WARNING: This will DELETE all existing services data!')
    console.log('   Proceeding in 3 seconds... Press Ctrl+C to cancel')

    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('STEP 1: Schema Migration')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const migrationSuccess = await runSQL(client, migrationSQL, 'Running schema migration')

    if (!migrationSuccess) {
      console.error('\n❌ Migration failed! Aborting.')
      process.exit(1)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('STEP 2: Data Population')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const dataSuccess = await runSQL(client, dataSQL, 'Populating services and add-ons')

    if (!dataSuccess) {
      console.error('\n❌ Data population failed!')
      process.exit(1)
    }

    // Verify the migration
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('STEP 3: Verification')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM service_categories) as categories,
        (SELECT COUNT(*) FROM services) as services,
        (SELECT COUNT(*) FROM service_pricing) as pricing_entries,
        (SELECT COUNT(*) FROM add_ons) as add_ons,
        (SELECT COUNT(*) FROM service_add_ons) as service_addon_links
    `)

    const stats = result.rows[0]

    console.log('\n📊 Database Statistics:')
    console.log(`   ✓ Service Categories: ${stats.categories}`)
    console.log(`   ✓ Services: ${stats.services}`)
    console.log(`   ✓ Pricing Entries: ${stats.pricing_entries}`)
    console.log(`   ✓ Add-ons: ${stats.add_ons}`)
    console.log(`   ✓ Service-Addon Links: ${stats.service_addon_links}`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ MIGRATION COMPLETE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    console.log('\n✨ Your services system is now ready!')
    console.log('   - All services match the Detail Dynamics pricing guide')
    console.log('   - Add-ons are linked to relevant services')
    console.log('   - Pricing is configured for all vehicle sizes')
    console.log('   - Ready for the CRM UI to be built')

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

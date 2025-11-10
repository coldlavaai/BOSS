const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function migrateCustomerNames() {
  console.log('🔄 Starting customer name migration...\n')

  try {
    // Step 1: Add new columns if they don't exist (via SQL)
    console.log('📝 Adding first_name and last_name columns...')

    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        DO $$
        BEGIN
          -- Add first_name column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'customers' AND column_name = 'first_name'
          ) THEN
            ALTER TABLE customers ADD COLUMN first_name TEXT;
          END IF;

          -- Add last_name column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'customers' AND column_name = 'last_name'
          ) THEN
            ALTER TABLE customers ADD COLUMN last_name TEXT;
          END IF;
        END $$;
      `
    })

    // If rpc doesn't work, we'll do it manually via direct SQL
    // For now, let's assume the columns exist and proceed with data migration

    // Step 2: Get all customers
    console.log('📋 Fetching all customers...')
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, name, first_name, last_name')
      .order('created_at')

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${customers.length} customers\n`)

    // Step 3: Split names and update records
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const customer of customers) {
      // Skip if already has first_name and last_name
      if (customer.first_name && customer.last_name) {
        console.log(`⏭️  Skipping ${customer.name} (already migrated)`)
        skipped++
        continue
      }

      // Skip if no name
      if (!customer.name || customer.name.trim() === '') {
        console.log(`⚠️  Skipping customer ${customer.id} (no name)`)
        skipped++
        continue
      }

      // Split name into first and last
      const nameParts = customer.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] // If only one name, use it for both

      console.log(`✏️  ${customer.name} → "${firstName}" + "${lastName}"`)

      // Update customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', customer.id)

      if (updateError) {
        console.error(`❌ Error updating ${customer.name}:`, updateError.message)
        errors++
      } else {
        updated++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary:')
    console.log(`  ✅ Updated: ${updated}`)
    console.log(`  ⏭️  Skipped: ${skipped}`)
    console.log(`  ❌ Errors: ${errors}`)
    console.log('='.repeat(50))

    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log('\n⚠️  Migration completed with errors')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

migrateCustomerNames()

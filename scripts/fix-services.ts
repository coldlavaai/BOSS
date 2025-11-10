import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixServices() {
  console.log('🗑️  Clearing incorrect services...')

  // Delete all existing services and categories
  await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('service_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('✅ Cleared old services')
  console.log('🌱 Creating correct service categories...')

  // Create correct categories
  const { data: categories } = await supabase
    .from('service_categories')
    .insert([
      { name: 'Valeting Services', description: 'Interior and exterior cleaning services', display_order: 1, active: true },
      { name: 'Protection Services', description: 'Paint protection, ceramic coating, and PPF services', display_order: 2, active: true },
    ])
    .select()

  if (!categories || categories.length === 0) {
    throw new Error('Failed to create categories')
  }

  const valetingId = categories.find(c => c.name === 'Valeting Services')!.id
  const protectionId = categories.find(c => c.name === 'Protection Services')!.id

  console.log('✅ Created categories')
  console.log('🌱 Seeding correct services...')

  // Prices in pence (VAT not included - shown as before VAT)
  const services = [
    // VALETING SERVICES
    {
      category_id: valetingId,
      name: 'Refresher Clean',
      description: 'Interior and exterior valet. Multi-stage wash, tar/bug removal, wheel cleaning, interior vacuum, dashboard cleaning, windows, 6-month spray sealant.',
      duration_hours: 2.5,
      price_small: 8000,
      price_medium: 10000,
      price_large: 12000,
      price_xl: 14000,
      active: true,
      display_order: 1,
    },
    {
      category_id: valetingId,
      name: 'Reset Cleanse',
      description: 'Premium deep valet. Thorough decontamination inside and out, engine bay cleaning, upholstery shampooing, leather conditioning, stain removal, protective treatments.',
      duration_hours: 5,
      price_small: 15000,
      price_medium: 17000,
      price_large: 19000,
      price_xl: 21000,
      active: true,
      display_order: 2,
    },
    {
      category_id: valetingId,
      name: 'Maintenance Plan',
      description: 'Regular scheduled cleaning for customers with comprehensive detailing. Monthly or bi-weekly appointments. Bespoke pricing.',
      duration_hours: 1.5,
      price_small: 0, // Bespoke pricing
      price_medium: 0,
      price_large: 0,
      price_xl: 0,
      active: true,
      display_order: 3,
    },
    {
      category_id: valetingId,
      name: 'Wheels Off Detail',
      description: 'Top-tier exterior package. All wheels removed for deep cleaning of barrels, calipers, and arches. Complete wash, decontamination, bug/tar removal, 12-month premium wax.',
      duration_hours: 5,
      price_small: 18000,
      price_medium: 21000,
      price_large: 24000,
      price_xl: 27000,
      active: true,
      display_order: 4,
    },

    // PROTECTION SERVICES
    {
      category_id: protectionId,
      name: 'Stage 1: Gloss Enhancement',
      description: 'Light machine polish with 2-year ceramic coating. For vehicles with dull paint but no visible swirls. Includes wheel and glass coating, light interior tidy. 1-2 days.',
      duration_hours: 16,
      price_small: 35000,
      price_medium: 45000,
      price_large: 55000,
      price_xl: 65000,
      active: true,
      display_order: 1,
    },
    {
      category_id: protectionId,
      name: 'Stage 2: Single Step Correction',
      description: 'Single-stage polish removing up to 70% of light swirls. 4-year ceramic coating on paint, wheels, and glass. Light interior tidy. 2 days.',
      duration_hours: 16,
      price_small: 50000,
      price_medium: 60000,
      price_large: 70000,
      price_xl: 80000,
      active: true,
      display_order: 2,
    },
    {
      category_id: protectionId,
      name: 'Stage 3: Multi-Step Correction',
      description: 'Multi-stage polish removing 80-90% of defects. 6-year ceramic coating on paint, wheels, and glass. Light interior tidy. 3 days.',
      duration_hours: 24,
      price_small: 70000,
      price_medium: 80000,
      price_large: 90000,
      price_xl: 100000,
      active: true,
      display_order: 3,
    },
    {
      category_id: protectionId,
      name: 'Stage 4: Deep Correction',
      description: 'Extensive correction removing up to 99% of swirls and scratches. 10-year ceramic coating on paint, wheel faces and barrels, glass. Full interior deep clean included. 4-5 days.',
      duration_hours: 32,
      price_small: 100000,
      price_medium: 110000,
      price_large: 120000,
      price_xl: 130000,
      active: true,
      display_order: 4,
    },
    {
      category_id: protectionId,
      name: 'New Car Protection',
      description: 'For vehicles under 1,000 miles. Transit wax removal, decontamination, light polish, 4-year ceramic coating on paint/wheels/glass. Light interior clean. 1-2 days.',
      duration_hours: 16,
      price_small: 30000,
      price_medium: 40000,
      price_large: 50000,
      price_xl: 60000,
      active: true,
      display_order: 5,
    },
    {
      category_id: protectionId,
      name: 'PPF Front End Package',
      description: 'Paint Protection Film on front bumper, hood, fenders, and mirrors. Self-healing polyurethane with 10-year warranty. 2-7 days.',
      duration_hours: 32,
      price_small: 130000,
      price_medium: 130000,
      price_large: 130000,
      price_xl: 130000, // From £1,300 - base price
      active: true,
      display_order: 6,
    },
    {
      category_id: protectionId,
      name: 'PPF Track Pack',
      description: 'Enhanced PPF coverage for track use and additional vulnerable zones. 10-year warranty. 2-7 days.',
      duration_hours: 40,
      price_small: 150000,
      price_medium: 150000,
      price_large: 150000,
      price_xl: 150000, // From £1,500
      active: true,
      display_order: 7,
    },
    {
      category_id: protectionId,
      name: 'PPF Full Vehicle Wrap',
      description: 'Comprehensive PPF coverage across entire vehicle. Maximum protection with 10-year warranty. 2-7 days.',
      duration_hours: 56,
      price_small: 350000,
      price_medium: 350000,
      price_large: 350000,
      price_xl: 350000, // From £3,500
      active: true,
      display_order: 8,
    },
    {
      category_id: protectionId,
      name: 'PPF Interior Trim',
      description: 'Paint Protection Film for interior elements prone to wear and scratches. Custom pricing upon request.',
      duration_hours: 8,
      price_small: 0, // Upon request
      price_medium: 0,
      price_large: 0,
      price_xl: 0,
      active: true,
      display_order: 9,
    },
    {
      category_id: protectionId,
      name: 'Van Sign Removal',
      description: 'Professional removal of van signage and decals with care to avoid paint damage. Custom pricing based on complexity.',
      duration_hours: 4,
      price_small: 0, // Custom quote
      price_medium: 0,
      price_large: 0,
      price_xl: 0,
      active: true,
      display_order: 10,
    },
  ]

  const { data: insertedServices, error } = await supabase
    .from('services')
    .insert(services)
    .select()

  if (error) {
    throw error
  }

  console.log(`✅ Seeded ${insertedServices.length} correct services`)
  console.log('\n✨ Services fixed successfully!')
  console.log('\n📋 Summary:')
  console.log('  Valeting Services: 4 services')
  console.log('  Protection Services: 10 services')
}

fixServices().catch(console.error)

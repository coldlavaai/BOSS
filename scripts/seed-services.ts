import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedServices() {
  try {
    console.log('🌱 Checking service categories...')

    // Check if categories already exist
    const { data: existingCats } = await supabase
      .from('service_categories')
      .select('name')

    const existingCatNames = existingCats?.map(c => c.name) || []

    // Only insert categories that don't exist
    const categoriesToInsert = [
      { name: 'Exterior Detailing', description: 'Professional exterior cleaning and detailing services', display_order: 1 },
      { name: 'Interior Detailing', description: 'Deep interior cleaning and restoration', display_order: 2 },
      { name: 'Ceramic Coating & Protection', description: 'Advanced paint protection and ceramic coating applications', display_order: 3 },
      { name: 'Paint Correction', description: 'Professional paint correction and polishing', display_order: 4 },
      { name: 'Specialty Services', description: 'Additional detailing services and maintenance', display_order: 5 },
    ].filter(cat => !existingCatNames.includes(cat.name))

    if (categoriesToInsert.length > 0) {
      const { data: categories, error: catError } = await supabase
        .from('service_categories')
        .insert(categoriesToInsert)
        .select()

      if (catError) throw catError
      console.log(`✅ Seeded ${categories.length} new categories`)
    } else {
      console.log('✅ All categories already exist')
    }

    // Fetch categories for IDs
    const { data: fetchedCategories } = await supabase
      .from('service_categories')
      .select('id, name')

    const catMap = Object.fromEntries(
      fetchedCategories!.map((cat) => [cat.name, cat.id])
    )

    console.log('🌱 Seeding services...')

    // Prepare services array
    const services = [
      // Exterior Detailing
      { category_id: catMap['Exterior Detailing'], name: 'Full Exterior Wash & Dry', description: 'Complete exterior hand wash with premium products, wheel cleaning, and careful hand drying', price_small: 3500, price_medium: 4500, price_large: 5500, price_xl: 7000, duration_hours: 1.5, active: true, display_order: 1 },
      { category_id: catMap['Exterior Detailing'], name: 'Maintenance Wash', description: 'Quick maintenance wash for regular customers, includes wash, dry, and tyre shine', price_small: 2500, price_medium: 3000, price_large: 3500, price_xl: 4500, duration_hours: 1.0, active: true, display_order: 2 },
      { category_id: catMap['Exterior Detailing'], name: 'Premium Exterior Detail', description: 'Full exterior wash, clay bar treatment, iron remover, tar removal, and tyre dressing', price_small: 8000, price_medium: 10000, price_large: 12500, price_xl: 15000, duration_hours: 3.0, active: true, display_order: 3 },
      { category_id: catMap['Exterior Detailing'], name: 'Wheels & Tyres Deep Clean', description: 'Deep clean of wheels, tyres, and arches with specialist products and brushes', price_small: 4000, price_medium: 4500, price_large: 5000, price_xl: 6000, duration_hours: 1.0, active: true, display_order: 4 },

      // Interior Detailing
      { category_id: catMap['Interior Detailing'], name: 'Interior Valet', description: 'Full interior vacuum, wipe down of all surfaces, glass cleaning, and air freshener', price_small: 5000, price_medium: 6500, price_large: 8000, price_xl: 10000, duration_hours: 2.0, active: true, display_order: 1 },
      { category_id: catMap['Interior Detailing'], name: 'Deep Interior Detail', description: 'Comprehensive interior detail including steam cleaning, leather conditioning, fabric protection', price_small: 12000, price_medium: 15000, price_large: 18000, price_xl: 22000, duration_hours: 4.0, active: true, display_order: 2 },
      { category_id: catMap['Interior Detailing'], name: 'Leather Treatment', description: 'Professional leather cleaning, conditioning, and protection for all leather surfaces', price_small: 6000, price_medium: 7500, price_large: 9000, price_xl: 11000, duration_hours: 2.0, active: true, display_order: 3 },
      { category_id: catMap['Interior Detailing'], name: 'Odour Removal', description: 'Ozone treatment or specialised cleaning to eliminate persistent odours', price_small: 8000, price_medium: 9000, price_large: 10000, price_xl: 12000, duration_hours: 2.5, active: true, display_order: 4 },

      // Ceramic Coating & Protection
      { category_id: catMap['Ceramic Coating & Protection'], name: 'Ceramic Coating - 1 Year', description: 'Professional grade ceramic coating with 1 year protection guarantee', price_small: 35000, price_medium: 45000, price_large: 55000, price_xl: 70000, duration_hours: 8.0, active: true, display_order: 1 },
      { category_id: catMap['Ceramic Coating & Protection'], name: 'Ceramic Coating - 3 Year', description: 'Premium ceramic coating system with 3 year protection guarantee', price_small: 55000, price_medium: 70000, price_large: 85000, price_xl: 105000, duration_hours: 10.0, active: true, display_order: 2 },
      { category_id: catMap['Ceramic Coating & Protection'], name: 'Ceramic Coating - 5 Year', description: 'Ultimate ceramic coating with 5 year protection and annual maintenance included', price_small: 85000, price_medium: 105000, price_large: 125000, price_xl: 155000, duration_hours: 12.0, active: true, display_order: 3 },
      { category_id: catMap['Ceramic Coating & Protection'], name: 'Paint Protection Film', description: 'Clear PPF application for high-impact areas (bonnet, bumper, mirrors)', price_small: 120000, price_medium: 150000, price_large: 180000, price_xl: 220000, duration_hours: 16.0, active: true, display_order: 4 },

      // Paint Correction
      { category_id: catMap['Paint Correction'], name: 'Single Stage Polish', description: 'One stage machine polish to enhance gloss and remove light imperfections', price_small: 25000, price_medium: 32000, price_large: 40000, price_xl: 50000, duration_hours: 6.0, active: true, display_order: 1 },
      { category_id: catMap['Paint Correction'], name: 'Two Stage Correction', description: 'Two stage machine polish for moderate swirl removal and paint enhancement', price_small: 45000, price_medium: 55000, price_large: 65000, price_xl: 80000, duration_hours: 10.0, active: true, display_order: 2 },
      { category_id: catMap['Paint Correction'], name: 'Multi-Stage Correction', description: 'Premium multi-stage correction for heavily swirled or damaged paintwork', price_small: 75000, price_medium: 95000, price_large: 115000, price_xl: 145000, duration_hours: 16.0, active: true, display_order: 3 },

      // Specialty Services
      { category_id: catMap['Specialty Services'], name: 'Headlight Restoration', description: 'Professional restoration of cloudy or yellowed headlights', price_small: 6000, price_medium: 6000, price_large: 6000, price_xl: 6000, duration_hours: 1.5, active: true, display_order: 1 },
      { category_id: catMap['Specialty Services'], name: 'Engine Bay Detail', description: 'Careful cleaning and dressing of engine bay components', price_small: 8000, price_medium: 9000, price_large: 10000, price_xl: 12000, duration_hours: 2.0, active: true, display_order: 2 },
      { category_id: catMap['Specialty Services'], name: 'New Car Protection Package', description: 'Complete protection package for new vehicles including ceramic coating and interior protection', price_small: 95000, price_medium: 115000, price_large: 135000, price_xl: 165000, duration_hours: 12.0, active: true, display_order: 3 },
    ]

    const { data: insertedServices, error: servError } = await supabase
      .from('services')
      .insert(services)
      .select()

    if (servError) throw servError

    console.log(`✅ Seeded ${insertedServices.length} services`)
    console.log('\n🎉 All services seeded successfully!')

    // Display summary
    const { data: summary } = await supabase
      .from('service_categories')
      .select('name, services(count)')

    console.log('\n📊 Summary:')
    summary?.forEach((cat) => {
      console.log(`  ${cat.name}: ${cat.services[0].count} services`)
    })

  } catch (error) {
    console.error('❌ Error seeding services:', error)
    process.exit(1)
  }
}

seedServices()

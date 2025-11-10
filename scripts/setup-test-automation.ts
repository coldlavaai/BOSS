import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setup() {
  console.log('🚀 Setting up test automation...\n')

  try {
    // Get the test user
    const testUserEmail = 'test@detaildynamics.uk'
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const testUser = users.find(u => u.email === testUserEmail)

    if (!testUser) {
      console.error('❌ Test user not found. Please create test@detaildynamics.uk first.')
      return
    }

    console.log(`✓ Found test user: ${testUser.email}`)

    // Get the existing template
    const { data: templates, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('name', 'Booking Confirmation')

    if (templateError || !templates || templates.length === 0) {
      console.error('❌ Booking Confirmation template not found')
      return
    }

    const template = templates[0]
    console.log(`✓ Found template: ${template.name}`)

    // Check if automation rule already exists
    const { data: existingRules } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('trigger_type', 'job_created')

    if (existingRules && existingRules.length > 0) {
      console.log(`✓ Automation rule already exists (${existingRules[0].id})`)
    } else {
      // Create automation rule
      const { data: rule, error: ruleError } = await supabase
        .from('email_automation_rules')
        .insert({
          user_id: testUser.id,
          name: 'Send Booking Confirmation',
          description: 'Automatically send booking confirmation when a job is created',
          trigger_type: 'job_created',
          template_id: template.id,
          is_active: true,
          send_to_customer: true,
        })
        .select()
        .single()

      if (ruleError) {
        console.error('❌ Failed to create automation rule:', ruleError)
        return
      }

      console.log(`✓ Created automation rule: ${rule.name}`)
    }

    // Check if test customer exists
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('*')
      .eq('email', 'oliver@coldlava.ai')

    let customerId: string

    if (existingCustomers && existingCustomers.length > 0) {
      customerId = existingCustomers[0].id
      console.log(`✓ Test customer already exists: ${existingCustomers[0].name}`)
    } else {
      // Create test customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: 'Oliver Tatler',
          email: 'oliver@coldlava.ai',
          phone: '+44 151 541 6933',
          business_name: 'Cold Lava',
          source: 'manual',
        })
        .select()
        .single()

      if (customerError) {
        console.error('❌ Failed to create customer:', customerError)
        return
      }

      customerId = customer.id
      console.log(`✓ Created test customer: ${customer.name}`)
    }

    // Check if test car exists
    const { data: existingCars } = await supabase
      .from('cars')
      .select('*')
      .eq('customer_id', customerId)

    let carId: string

    if (existingCars && existingCars.length > 0) {
      carId = existingCars[0].id
      console.log(`✓ Test car already exists: ${existingCars[0].make} ${existingCars[0].model}`)
    } else {
      // Create test car
      const { data: car, error: carError} = await supabase
        .from('cars')
        .insert({
          customer_id: customerId,
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          registration: 'TEST123',
          size_category: 'medium',
        })
        .select()
        .single()

      if (carError) {
        console.error('❌ Failed to create car:', carError)
        return
      }

      carId = car.id
      console.log(`✓ Created test car: ${car.make} ${car.model}`)
    }

    console.log('\n✅ Test automation setup complete!')
    console.log('\nNext steps:')
    console.log('1. Set RESEND_API_KEY in .env.local')
    console.log('2. Set EMAIL_FROM in .env.local (e.g., "Detail Dynamics <hello@yourdomain.com>")')
    console.log('3. Create a booking for Oliver Tatler via the UI')
    console.log('4. Check oliver@coldlava.ai for the confirmation email')
    console.log('\nTest data created:')
    console.log(`- Customer ID: ${customerId}`)
    console.log(`- Car ID: ${carId}`)
    console.log(`- Template ID: ${template.id}`)

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setup()

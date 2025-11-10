const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function runTest() {
  console.log('\n🧪 Starting automation test...\n')
  
  // Get main user
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.log('❌ Failed to get users:', usersError.message)
    return
  }
  const mainUser = users.find(u => u.email === 'test@detaildynamics.uk')
  if (!mainUser) {
    console.log('❌ User test@detaildynamics.uk not found')
    console.log('Available users:', users.map(u => u.email).join(', '))
    return
  }

  console.log('✅ Found user:', mainUser.email)
  
  // Find existing test customer
  const { data: existingCustomers } = await supabase
    .from('customers')
    .select('*')
    .or('email.eq.oliver@coldlava.ai,name.ilike.%oliver%')
    .limit(1)

  let customer = existingCustomers?.[0]

  if (customer) {
    console.log('✅ Using existing customer:', customer.name, '-', customer.email)
    if (customer.email !== 'oliver@coldlava.ai') {
      await supabase
        .from('customers')
        .update({ email: 'oliver@coldlava.ai' })
        .eq('id', customer.id)
      customer.email = 'oliver@coldlava.ai'
      console.log('   Updated email to oliver@coldlava.ai')
    }
  } else {
    console.log('📝 Creating new test customer...')
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: 'Test Detail Dynamics',
        email: 'oliver@coldlava.ai',
        phone: '+44 151 541 6933',
      })
      .select()
      .single()

    if (error) {
      console.log('❌ Failed:', error.message)
      return
    }
    customer = newCustomer
    console.log('✅ Created customer:', customer.name)
  }

  // Create template
  console.log('\n📧 Creating email template...')
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .insert({
      user_id: mainUser.id,
      name: 'Test Booking Confirmation ' + Date.now(),
      template_type: 'custom',
      subject_template: 'Booking Confirmation for {{customer.name}}',
      body_html: '<p>Hi {{customer.name}},</p><p>Your booking for <strong>{{service.name}}</strong> is confirmed!</p><p><strong>Date:</strong> {{job.booking_date}}<br><strong>Time:</strong> {{job.booking_time}}<br><strong>Price:</strong> {{job.total_price}}</p>',
      is_active: true,
    })
    .select()
    .single()

  if (templateError) {
    console.log('❌ Failed:', templateError.message)
    return
  }
  console.log('✅ Created template:', template.name)

  // Create automation rule
  console.log('\n⚙️ Creating automation rule...')
  const { data: rule, error: ruleError } = await supabase
    .from('email_automation_rules')
    .insert({
      user_id: mainUser.id,
      name: 'Test New Booking Rule ' + Date.now(),
      trigger_type: 'new_booking',
      template_id: template.id,
      send_to_customer: true,
      is_active: true,
    })
    .select()
    .single()
  
  if (ruleError) {
    console.log('❌ Failed:', ruleError.message)
    return
  }
  console.log('✅ Created rule: new_booking -> template')
  
  // Get service (get any service from the database)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .limit(1)

  if (!services || services.length === 0) {
    console.log('❌ No services found')
    return
  }
  const service = services[0]
  console.log('✅ Using service:', service.name)

  // Get pipeline stage (get any stage from the database)
  let { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .limit(1)

  let stage
  if (!stages || stages.length === 0) {
    console.log('⚠️  No pipeline stages found, creating one...')
    const { data: newStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .insert({
        name: 'New Booking',
        color: '#22c55e',
      })
      .select()
      .single()

    if (stageError) {
      console.log('❌ Failed to create stage:', stageError.message)
      return
    }
    stage = newStage
    console.log('✅ Created pipeline stage:', stage.name)
  } else {
    stage = stages[0]
    console.log('✅ Using pipeline stage:', stage.name)
  }

  // Get a car for this customer
  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('customer_id', customer.id)
    .limit(1)

  if (!cars || cars.length === 0) {
    console.log('❌ No cars found for this customer')
    return
  }
  const car = cars[0]
  console.log('✅ Using car:', car.make, car.model)

  // Create booking
  console.log('\n📅 Creating booking...')
  const bookingDate = new Date()
  bookingDate.setDate(bookingDate.getDate() + 7)

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      customer_id: customer.id,
      service_id: service.id,
      car_id: car.id,
      pipeline_stage_id: stage.id,
      booking_datetime: bookingDate.toISOString(),
      base_price: 22800,
      total_price: 22800,
      deposit_amount: 5000,
    })
    .select()
    .single()
  
  if (jobError) {
    console.log('❌ Failed:', jobError.message)
    return
  }
  console.log('✅ Created booking:', job.id)
  
  // Trigger automation
  console.log('\n🚀 Triggering automation API...')
  const response = await fetch('https://detail-dynamics-op7rfeb50-olivers-projects-a3cbd2e0.vercel.app/api/trigger-automation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      triggerType: 'new_booking',
      jobId: job.id,
      customerId: customer.id,
    }),
  })

  console.log('API status:', response.status, response.statusText)
  const responseText = await response.text()
  console.log('API response text:', responseText)

  let result
  try {
    result = JSON.parse(responseText)
    console.log('API response JSON:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('⚠️  API did not return valid JSON')
  }
  
  // Wait for email to be logged
  console.log('\n⏳ Waiting 5 seconds for email to process...')
  await new Promise(r => setTimeout(r, 5000))
  
  // Check logs
  const { data: logs } = await supabase
    .from('email_automation_logs')
    .select('*')
    .eq('job_id', job.id)
    .order('created_at', { ascending: false })
  
  console.log('\n📊 FINAL RESULT:')
  if (logs && logs.length > 0) {
    console.log('✅ EMAIL WAS SENT SUCCESSFULLY!')
    console.log('   To:', logs[0].recipient_email)
    console.log('   Subject:', logs[0].subject)
    console.log('   Status:', logs[0].status)
    console.log('   Time:', new Date(logs[0].created_at).toLocaleString())
  } else {
    console.log('❌ EMAIL WAS NOT SENT - No log entry found')
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('email_automation_logs').delete().eq('job_id', job.id)
  await supabase.from('jobs').delete().eq('id', job.id)
  await supabase.from('email_automation_rules').delete().eq('id', rule.id)
  await supabase.from('email_templates').delete().eq('id', template.id)
  console.log('✅ Test complete')
}

runTest().catch(console.error)

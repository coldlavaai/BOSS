import { createClient } from '@/lib/supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient()

async function runTest() {
  console.log('🧪 Starting automation test...\n')
  
  // Step 1: Create test customer
  console.log('📝 Step 1: Creating test customer...')
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name: 'Oliver Tatler',
      email: 'oliver@coldlava.ai',
      phone: '+44 151 541 6933',
    })
    .select()
    .single()
  
  if (customerError) {
    console.log('❌ Failed to create customer:', customerError.message)
    return
  }
  
  console.log('✅ Created customer:', customer.name, '-', customer.email)
  
  // Step 2: Create email template
  console.log('\n📧 Step 2: Creating email template...')
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .insert({
      name: 'Test Booking Confirmation',
      template_type: 'custom',
      subject_template: 'Booking Confirmation for {{customer.name}}',
      body_html: '<p>Hi {{customer.name}},</p><p>Your booking for <strong>{{service.name}}</strong> has been confirmed!</p><p><strong>Date:</strong> {{job.booking_date}}<br><strong>Time:</strong> {{job.booking_time}}<br><strong>Total Price:</strong> {{job.total_price}}</p><p>We look forward to seeing you!</p>',
      is_active: true,
    })
    .select()
    .single()
  
  if (templateError) {
    console.log('❌ Failed to create template:', templateError.message)
    return
  }
  
  console.log('✅ Created template:', template.name)
  
  // Step 3: Create automation rule
  console.log('\n⚙️ Step 3: Creating automation rule...')
  const { data: rule, error: ruleError } = await supabase
    .from('email_automation_rules')
    .insert({
      trigger_type: 'new_booking',
      template_id: template.id,
      send_to_customer: true,
      is_active: true,
    })
    .select()
    .single()
  
  if (ruleError) {
    console.log('❌ Failed to create rule:', ruleError.message)
    return
  }
  
  console.log('✅ Created automation rule: new_booking -> Test Booking Confirmation')
  
  // Get a service
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
  
  // Get a pipeline stage
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('order_index')
    .limit(1)
  
  const stage = stages?.[0]
  
  // Step 4: Create booking
  console.log('\n📅 Step 4: Creating booking...')
  const bookingDate = new Date()
  bookingDate.setDate(bookingDate.getDate() + 7) // 7 days from now
  
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      customer_id: customer.id,
      service_id: service.id,
      pipeline_stage_id: stage?.id,
      booking_datetime: bookingDate.toISOString(),
      total_price: 22800, // £228 in pence
      deposit_amount: 5000, // £50 in pence
    })
    .select()
    .single()
  
  if (jobError) {
    console.log('❌ Failed to create job:', jobError.message)
    return
  }
  
  console.log('✅ Created booking:', job.id)
  
  // Step 5: Trigger automation
  console.log('\n🚀 Step 5: Triggering automation...')
  
  const response = await fetch('https://detail-dynamics-op7rfeb50-olivers-projects-a3cbd2e0.vercel.app/api/trigger-automation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      triggerType: 'new_booking',
      jobId: job.id,
      customerId: customer.id,
    }),
  })
  
  const result = await response.json()
  console.log('Automation response:', result)
  
  if (!response.ok) {
    console.log('❌ Automation trigger failed:', result.error)
    return
  }
  
  // Step 6: Check automation logs
  console.log('\n📊 Step 6: Checking automation logs...')
  await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
  
  const { data: logs } = await supabase
    .from('email_automation_logs')
    .select('*')
    .eq('job_id', job.id)
    .order('created_at', { ascending: false })
  
  if (logs && logs.length > 0) {
    const log = logs[0]
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!')
    console.log('   To:', log.recipient_email)
    console.log('   Subject:', log.subject)
    console.log('   Status:', log.status)
    console.log('   Sent at:', new Date(log.created_at).toLocaleString())
  } else {
    console.log('\n❌ No email log found - email may not have been sent')
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('email_automation_logs').delete().eq('job_id', job.id)
  await supabase.from('jobs').delete().eq('id', job.id)
  await supabase.from('email_automation_rules').delete().eq('id', rule.id)
  await supabase.from('email_templates').delete().eq('id', template.id)
  await supabase.from('customers').delete().eq('id', customer.id)
  console.log('✅ Test data cleaned up')
}

runTest().catch(console.error)

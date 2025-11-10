import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EnterpriseConversationsLayout } from '@/components/communications/EnterpriseConversationsLayout'

// Use ISR with short revalidation time for better performance
export const revalidate = 30 // Revalidate every 30 seconds

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all customers (RLS handles user filtering)
  const { data: customers, error: customersError} = await supabase
    .from('customers')
    .select('*')
    .order('name')

  console.log('[CommunicationsPage] Fetched customers:', customers?.length, customers)
  if (customersError) {
    console.error('[CommunicationsPage] Error fetching customers:', customersError)
  }

  // Fetch email integrations
  const { data: emailIntegrations } = await supabase
    .from('email_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Fetch recent emails with customer data and attachments (paginated for performance)
  const { data: emails } = await supabase
    .from('email_threads')
    .select(`
      *,
      customer:customers(*),
      email_attachments(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) // Reduced from 200 to 50 for faster initial load

  // Fetch recent SMS messages with customer data (paginated for performance)
  const { data: smsMessages } = await supabase
    .from('sms_messages')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) // Reduced from 200 to 50 for faster initial load

  // Fetch all jobs with services, pipeline stages, and add-ons (jobs table has no user_id, relies on RLS)
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      service:services(*),
      pipeline_stage:pipeline_stages(*),
      job_add_ons(
        add_on:add_ons(*)
      )
    `)
    .order('booking_datetime', { ascending: false })

  // Fetch all customer files
  const { data: customerFiles } = await supabase
    .from('customer_files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <EnterpriseConversationsLayout
      customers={customers || []}
      emails={emails || []}
      smsMessages={smsMessages || []}
      jobs={jobs || []}
      emailIntegrations={emailIntegrations || []}
      customerFiles={customerFiles || []}
    />
  )
}

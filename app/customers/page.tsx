import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomersList } from '@/components/customers/CustomersList'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { customerId?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch customers with their cars, jobs, and communications
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      cars(*),
      jobs(id, pipeline_stage_id, booking_datetime, completed_at),
      email_threads(id, created_at),
      sms_messages(id, created_at)
    `)
    .order('created_at', { ascending: false })

  // Fetch pipeline stages to determine completed jobs
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, stage_type')

  const completedStageIds = stages?.filter(s => s.stage_type === 'completed').map(s => s.id) || []

  // Calculate metrics for each customer
  const customersWithMetrics = customers?.map(customer => {
    const totalJobs = customer.jobs?.filter((j: any) =>
      completedStageIds.includes(j.pipeline_stage_id)
    ).length || 0

    const currentJobs = customer.jobs?.filter((j: any) =>
      !completedStageIds.includes(j.pipeline_stage_id) && j.booking_datetime
    ).length || 0

    // Get last communication date
    const emailDates = customer.email_threads?.map((e: any) => new Date(e.created_at)) || []
    const smsDates = customer.sms_messages?.map((s: any) => new Date(s.created_at)) || []
    const allDates = [...emailDates, ...smsDates]
    const lastCommunication = allDates.length > 0
      ? new Date(Math.max(...allDates.map(d => d.getTime())))
      : null

    return {
      ...customer,
      totalJobs,
      currentJobs,
      lastCommunication: lastCommunication?.toISOString() || null
    }
  }) || []

  return (
    <div className="h-full">
      <CustomersList
        initialCustomers={customersWithMetrics}
        initialCustomerId={searchParams.customerId}
      />
    </div>
  )
}

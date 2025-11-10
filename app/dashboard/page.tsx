import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardWithNav } from '@/components/dashboard/DashboardWithNav'

// Revalidate every 60 seconds for better performance
export const revalidate = 60

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Google Calendar integration
  const { data: googleIntegration } = await supabase
    .from('google_calendar_integrations')
    .select('calendar_name, calendar_id, last_sync_at, two_way_sync_enabled')
    .eq('user_id', user.id)
    .single()

  // Fetch all jobs with related data for the dashboard
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      car:cars(*),
      service:services(*),
      pipeline_stage:pipeline_stages(*)
    `)
    .order('booking_datetime', { ascending: true })

  // Use user metadata for display name
  const displayName = user.user_metadata?.first_name || user.user_metadata?.full_name || 'Oliver'

  return (
    <div className="p-4 lg:p-8 bg-gray-50 min-h-full">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: '#32373c' }}>Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-1">Welcome back, {displayName}</p>
      </div>

      <DashboardWithNav
        jobs={jobs || []}
        googleIntegration={googleIntegration}
      />
    </div>
  )
}

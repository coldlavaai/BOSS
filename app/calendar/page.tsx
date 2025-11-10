import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobCalendar } from '@/components/calendar/JobCalendar'

export default async function CalendarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all jobs with related data
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

  // Fetch pipeline stages for create/edit dialogs
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('is_archived', false)
    .order('display_order')

  return (
    <JobCalendar
      initialJobs={jobs || []}
      stages={stages || []}
    />
  )
}

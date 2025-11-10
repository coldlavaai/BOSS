import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimeEntriesList } from '@/components/time/TimeEntriesList'

export default async function TimeTrackingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all time entries with project and client info
  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      project:projects(
        id, name, hourly_rate_gbp,
        client:clients(id, name, company)
      )
    `)
    .order('date', { ascending: false })
    .limit(100)

  // Fetch all active projects for the time entry form
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name,
      client:clients(id, name, company)
    `)
    .in('status', ['planning', 'active'])
    .order('name')

  if (error) {
    console.error('Error fetching time entries:', error)
  }

  // Calculate total hours and revenue
  const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0
  const totalRevenue = timeEntries?.reduce((sum, entry) => {
    const hours = entry.hours || 0
    const rate = entry.project?.hourly_rate_gbp || 0
    return sum + (hours * rate)
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Time Tracking</h1>
        <p className="text-slate-600 mt-1">Track hours worked and calculate revenue</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600">Total Hours</p>
          <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-700">£{(totalRevenue / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600">Avg Rate</p>
          <p className="text-2xl font-bold text-blue-700">
            £{totalHours > 0 ? ((totalRevenue / 100) / totalHours).toFixed(2) : '0.00'}/hr
          </p>
        </div>
      </div>

      <TimeEntriesList initialEntries={timeEntries || []} projects={projects || []} />
    </div>
  )
}

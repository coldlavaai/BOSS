import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MetricsDashboard } from '@/components/metrics/MetricsDashboard'

export default async function MetricsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch recent events (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Metrics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track user actions, performance, and system health
          </p>
        </div>

        <MetricsDashboard events={events || []} />
      </div>
    </div>
  )
}

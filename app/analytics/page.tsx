import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all jobs with services and add-ons
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      service:services(id, name, category_id),
      job_add_ons(
        add_on:add_ons(id, name, price_incl_vat)
      )
    `)
    .order('booking_datetime', { ascending: false })

  // Fetch service categories for grouping
  const { data: categories } = await supabase
    .from('service_categories')
    .select('*')
    .order('display_order')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Services Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Insights into your most popular services and add-ons
          </p>
        </div>

        <AnalyticsDashboard
          jobs={jobs || []}
          categories={categories || []}
        />
      </div>
    </div>
  )
}

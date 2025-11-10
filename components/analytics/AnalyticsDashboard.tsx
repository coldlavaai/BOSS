'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/types/services'
import { TrendingUp, Package, Plus, DollarSign, Calendar } from 'lucide-react'

interface Job {
  id: string
  total_price: number
  booking_datetime: string
  service: {
    id: string
    name: string
    category_id: string
  }
  job_add_ons?: Array<{
    add_on: {
      id: string
      name: string
      price_incl_vat: number
    }
  }>
}

interface Category {
  id: string
  name: string
}

interface Props {
  jobs: Job[]
  categories: Category[]
}

export function AnalyticsDashboard({ jobs, categories }: Props) {
  // Calculate service popularity
  const serviceStats = useMemo(() => {
    const stats: Record<string, { name: string; count: number; revenue: number }> = {}

    jobs.forEach(job => {
      if (!job.service) return

      if (!stats[job.service.id]) {
        stats[job.service.id] = {
          name: job.service.name,
          count: 0,
          revenue: 0
        }
      }

      stats[job.service.id].count++
      stats[job.service.id].revenue += job.total_price
    })

    return Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [jobs])

  // Calculate add-on popularity
  const addOnStats = useMemo(() => {
    const stats: Record<string, { name: string; count: number; revenue: number }> = {}

    jobs.forEach(job => {
      if (!job.job_add_ons) return

      job.job_add_ons.forEach(ja => {
        if (!ja.add_on) return

        if (!stats[ja.add_on.id]) {
          stats[ja.add_on.id] = {
            name: ja.add_on.name,
            count: 0,
            revenue: 0
          }
        }

        stats[ja.add_on.id].count++
        stats[ja.add_on.id].revenue += ja.add_on.price_incl_vat
      })
    })

    return Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [jobs])

  // Calculate revenue by category
  const categoryRevenue = useMemo(() => {
    const revenue: Record<string, number> = {}

    jobs.forEach(job => {
      if (!job.service) return
      const categoryId = job.service.category_id

      if (!revenue[categoryId]) {
        revenue[categoryId] = 0
      }

      revenue[categoryId] += job.total_price
    })

    return categories.map(cat => ({
      ...cat,
      revenue: revenue[cat.id] || 0,
      jobCount: jobs.filter(j => j.service?.category_id === cat.id).length
    })).sort((a, b) => b.revenue - a.revenue)
  }, [jobs, categories])

  // Overall stats
  const totalRevenue = useMemo(() => {
    return jobs.reduce((sum, job) => sum + job.total_price, 0)
  }, [jobs])

  const totalJobs = jobs.length
  const averageJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0

  // Jobs with add-ons
  const jobsWithAddOns = jobs.filter(j => j.job_add_ons && j.job_add_ons.length > 0).length
  const addOnAttachRate = totalJobs > 0 ? (jobsWithAddOns / totalJobs) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#d52329' }}>
              {formatPrice(totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">From {totalJobs} jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Avg Job Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(averageJobValue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per job</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Add-on Attach Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {addOnAttachRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">{jobsWithAddOns} jobs with add-ons</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalJobs}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Most Popular Services
          </CardTitle>
          <CardDescription>
            Ranked by number of bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {serviceStats.slice(0, 10).map((service, idx) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900">{service.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {service.count} {service.count === 1 ? 'booking' : 'bookings'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900">
                    {formatPrice(service.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">revenue</div>
                </div>
              </div>
            ))}
            {serviceStats.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No services data available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Add-ons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Most Popular Add-ons
            </CardTitle>
            <CardDescription>
              Ranked by selection frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {addOnStats.slice(0, 8).map((addon, idx) => (
                <div key={addon.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-medium text-gray-500 w-6">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{addon.name}</div>
                      <div className="text-xs text-gray-500">{addon.count}× selected</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(addon.revenue)}
                  </div>
                </div>
              ))}
              {addOnStats.length === 0 && (
                <div className="text-center text-gray-500 py-6 text-sm">
                  No add-ons selected yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Revenue by Category
            </CardTitle>
            <CardDescription>
              Service category breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryRevenue.map((category) => (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{category.name}</span>
                    <span className="font-bold text-gray-900">{formatPrice(category.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${totalRevenue > 0 ? (category.revenue / totalRevenue) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {category.jobCount} {category.jobCount === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                </div>
              ))}
              {categoryRevenue.length === 0 && (
                <div className="text-center text-gray-500 py-6 text-sm">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-900">
            {serviceStats.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>{serviceStats[0].name}</strong> is your most popular service with{' '}
                  <strong>{serviceStats[0].count}</strong> bookings
                </span>
              </div>
            )}
            {addOnStats.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>{addOnStats[0].name}</strong> is the most frequently selected add-on
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                {addOnAttachRate.toFixed(0)}% of jobs include at least one add-on
                {addOnAttachRate < 50 && ' - consider promoting add-ons more during booking'}
              </span>
            </div>
            {categoryRevenue.length > 0 && categoryRevenue[0].revenue > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>{categoryRevenue[0].name}</strong> generates the most revenue at{' '}
                  {formatPrice(categoryRevenue[0].revenue)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

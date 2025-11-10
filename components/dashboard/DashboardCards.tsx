'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  format,
  formatDistanceToNow
} from 'date-fns'
import { Calendar, ArrowLeftRight } from 'lucide-react'
import { JobListDialog } from './JobListDialog'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface GoogleIntegration {
  calendar_name: string | null
  calendar_id: string
  last_sync_at: string | null
  two_way_sync_enabled: boolean
}

interface DashboardCardsProps {
  jobs: Job[]
  googleIntegration: GoogleIntegration | null
  monthOffset?: number
}

export function DashboardCards({ jobs, googleIntegration, monthOffset = 0 }: DashboardCardsProps) {
  const [selectedJobList, setSelectedJobList] = useState<{
    title: string
    jobs: Job[]
  } | null>(null)

  const now = new Date()
  const baseDate = useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + monthOffset)
    return date
  }, [monthOffset])

  const todayStart = startOfToday()
  const todayEnd = endOfToday()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(baseDate)

  // Calculate metrics
  const metrics = useMemo(() => {
    const todayJobs = jobs.filter((job) => {
      const bookingDate = new Date(job.booking_datetime)
      return bookingDate >= todayStart && bookingDate <= todayEnd
    })

    const weekJobs = jobs.filter((job) => {
      const bookingDate = new Date(job.booking_datetime)
      return bookingDate >= weekStart && bookingDate <= weekEnd
    })

    const monthJobs = jobs.filter((job) => {
      const bookingDate = new Date(job.booking_datetime)
      return bookingDate >= monthStart && bookingDate <= monthEnd
    })

    // Split into coming (not completed) and completed (archived stage)
    const todayComing = todayJobs.filter((job) => !job.pipeline_stage?.is_archived)
    const todayCompleted = todayJobs.filter((job) => job.pipeline_stage?.is_archived)

    const weekComing = weekJobs.filter((job) => !job.pipeline_stage?.is_archived)
    const weekCompleted = weekJobs.filter((job) => job.pipeline_stage?.is_archived)

    const monthComing = monthJobs.filter((job) => !job.pipeline_stage?.is_archived)
    const monthCompleted = monthJobs.filter((job) => job.pipeline_stage?.is_archived)

    // Calculate revenue from completed jobs this month
    const monthRevenue = monthCompleted.reduce((sum, job) => sum + job.total_price, 0)

    // Calculate predicted revenue from future booked jobs (not yet completed)
    const futureJobs = jobs.filter((job) => {
      const bookingDate = new Date(job.booking_datetime)
      return isAfter(bookingDate, now) && !job.pipeline_stage?.is_archived
    })
    const predictedRevenue = futureJobs.reduce((sum, job) => sum + job.total_price, 0)

    return {
      today: { coming: todayComing, completed: todayCompleted },
      week: { coming: weekComing, completed: weekCompleted },
      month: { coming: monthComing, completed: monthCompleted },
      revenue: monthRevenue,
      predicted: predictedRevenue,
      futureJobs,
    }
  }, [jobs, todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd, now, baseDate])

  const handleCardClick = (title: string, jobList: Job[]) => {
    setSelectedJobList({ title, jobs: jobList })
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Jobs */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick("Today's Jobs", [...metrics.today.coming, ...metrics.today.completed])}
        >
          <CardHeader>
            <CardDescription>Today's Jobs</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.today.coming.length + metrics.today.completed.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Coming: <strong>{metrics.today.coming.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Done: <strong>{metrics.today.completed.length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week's Jobs */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick("This Week's Jobs", [...metrics.week.coming, ...metrics.week.completed])}
        >
          <CardHeader>
            <CardDescription>This Week's Jobs</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.week.coming.length + metrics.week.completed.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Coming: <strong>{metrics.week.coming.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Done: <strong>{metrics.week.completed.length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month's Jobs */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick("This Month's Jobs", [...metrics.month.coming, ...metrics.month.completed])}
        >
          <CardHeader>
            <CardDescription>This Month's Jobs</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.month.coming.length + metrics.month.completed.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Coming: <strong>{metrics.month.coming.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Done: <strong>{metrics.month.completed.length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardDescription>Revenue This Month</CardDescription>
            <CardTitle className="text-3xl" style={{ color: '#d52329' }}>
              £{(metrics.revenue / 100).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              From {metrics.month.completed.length} completed {metrics.month.completed.length === 1 ? 'job' : 'jobs'}
            </p>
          </CardContent>
        </Card>

        {/* Predicted Revenue */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('Future Booked Jobs', metrics.futureJobs)}
        >
          <CardHeader>
            <CardDescription>Predicted Revenue</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              £{(metrics.predicted / 100).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              From {metrics.futureJobs.length} upcoming {metrics.futureJobs.length === 1 ? 'job' : 'jobs'}
            </p>
          </CardContent>
        </Card>

        {/* Google Calendar Status */}
        {googleIntegration && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                {googleIntegration.two_way_sync_enabled && (
                  <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                )}
              </div>
              <CardDescription>Google Calendar</CardDescription>
              <CardTitle className="text-lg truncate">
                {googleIntegration.calendar_name || googleIntegration.calendar_id}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  {googleIntegration.two_way_sync_enabled ? (
                    <span className="text-purple-600 font-medium">Two-way sync enabled</span>
                  ) : (
                    <span className="text-blue-600 font-medium">One-way sync</span>
                  )}
                </p>
                {googleIntegration.last_sync_at && (
                  <p className="text-xs text-gray-500">
                    Last synced {formatDistanceToNow(new Date(googleIntegration.last_sync_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedJobList && (
        <JobListDialog
          title={selectedJobList.title}
          jobs={selectedJobList.jobs}
          onClose={() => setSelectedJobList(null)}
        />
      )}
    </>
  )
}

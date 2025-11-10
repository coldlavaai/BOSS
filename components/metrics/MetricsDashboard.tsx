'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface Event {
  id: string
  user_id: string | null
  event_type: string
  event_category: string
  event_data: any
  duration_ms: number | null
  page_path: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

interface Props {
  events: Event[]
}

export function MetricsDashboard({ events }: Props) {
  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalEvents = events.length
    const successfulEvents = events.filter(e => e.success).length
    const failedEvents = events.filter(e => !e.success).length
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0

    // Event type breakdown
    const eventTypes: Record<string, { count: number; successes: number; avgDuration: number }> = {}

    events.forEach(event => {
      if (!eventTypes[event.event_type]) {
        eventTypes[event.event_type] = { count: 0, successes: 0, avgDuration: 0 }
      }
      eventTypes[event.event_type].count++
      if (event.success) eventTypes[event.event_type].successes++
      if (event.duration_ms) {
        eventTypes[event.event_type].avgDuration += event.duration_ms
      }
    })

    // Calculate averages
    Object.keys(eventTypes).forEach(type => {
      if (eventTypes[type].count > 0) {
        eventTypes[type].avgDuration = Math.round(eventTypes[type].avgDuration / eventTypes[type].count)
      }
    })

    // Average durations
    const eventsWithDuration = events.filter(e => e.duration_ms !== null)
    const avgDuration = eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / eventsWithDuration.length
      : 0

    // Recent errors
    const recentErrors = events
      .filter(e => !e.success)
      .slice(0, 10)

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate,
      eventTypes,
      avgDuration,
      recentErrors,
    }
  }, [events])

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format event type name
  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.totalEvents.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Success Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.successfulEvents} successful, {metrics.failedEvents} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Avg Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(metrics.avgDuration)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Event Types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(metrics.eventTypes).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Unique actions tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Event Performance
          </CardTitle>
          <CardDescription>
            Success rates and average duration by event type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.eventTypes)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([type, data]) => {
                const successRate = (data.successes / data.count) * 100
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">
                        {formatEventType(type)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {data.count} events • {data.successes} successful
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {successRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">success</div>
                      </div>
                      {data.avgDuration > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            {formatDuration(data.avgDuration)}
                          </div>
                          <div className="text-xs text-gray-500">avg time</div>
                        </div>
                      )}
                      {successRate >= 95 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : successRate >= 80 ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            {Object.keys(metrics.eventTypes).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No events tracked yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      {metrics.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recent Errors
            </CardTitle>
            <CardDescription>
              Last 10 failed operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recentErrors.map((error) => (
                <div key={error.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-red-900">
                        {formatEventType(error.event_type)}
                      </div>
                      <div className="text-xs text-red-700 mt-1">
                        {error.error_message || 'Unknown error'}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {new Date(error.created_at).toLocaleString()}
                        {error.page_path && ` • ${error.page_path}`}
                      </div>
                    </div>
                    {error.duration_ms && (
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(error.duration_ms)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-900">
            {metrics.successRate >= 95 && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                <span>System is performing well with {metrics.successRate.toFixed(1)}% success rate</span>
              </div>
            )}
            {metrics.successRate < 95 && metrics.successRate >= 80 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                <span>Success rate is acceptable at {metrics.successRate.toFixed(1)}% but could be improved</span>
              </div>
            )}
            {metrics.successRate < 80 && (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 text-red-600" />
                <span>Success rate is low at {metrics.successRate.toFixed(1)}% - investigate recent errors</span>
              </div>
            )}
            {metrics.avgDuration > 5000 && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-yellow-600" />
                <span>Average operation time is high ({formatDuration(metrics.avgDuration)}) - consider optimization</span>
              </div>
            )}
            {metrics.failedEvents > 10 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                <span>{metrics.failedEvents} operations failed in the last 30 days - review error log above</span>
              </div>
            )}
            {metrics.totalEvents === 0 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>No events tracked yet - start using the CRM to see metrics</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

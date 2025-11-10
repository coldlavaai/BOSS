'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, momentLocalizer, Views, Event, EventProps } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Database } from '@/types/database'
import { CreateJobDialog } from '@/components/board/CreateJobDialog'
import { EditJobDialog } from '@/components/board/EditJobDialog'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Calendar as CalendarIcon, RefreshCw, Loader2, Clock, MapPin, FileText, ExternalLink } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const localizer = momentLocalizer(moment)

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

interface JobCalendarProps {
  initialJobs: Job[]
  stages: PipelineStage[]
}

interface CalendarEvent extends Event {
  id: string
  job?: Job
  isGoogleEvent?: boolean
  googleEventData?: any
}

interface GoogleCalendarIntegration {
  id: string
  email: string
  calendar_name: string | null
  sync_enabled: boolean
  last_sync_at: string | null
}

// Custom event component with hover tooltip
function CustomEvent({ event }: EventProps<CalendarEvent>) {
  const startTime = format(event.start as Date, 'p')
  const endTime = format(event.end as Date, 'p')
  const timeString = `${startTime} - ${endTime}`

  return (
    <div
      className="event-with-tooltip h-full"
      data-tooltip={timeString}
      title={`${event.title}\n${timeString}`}
    >
      {event.title}
    </div>
  )
}

export function JobCalendar({ initialJobs, stages }: JobCalendarProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [googleIntegration, setGoogleIntegration] = useState<GoogleCalendarIntegration | null>(null)
  const [integrationLoading, setIntegrationLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [googleEvents, setGoogleEvents] = useState<any[]>([])
  const [showSyncedView, setShowSyncedView] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showGoogleCalendarEvents')
      return saved === 'true'
    }
    return false
  })
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<any>(null)

  const supabase = createClient()

  // Save toggle state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showGoogleCalendarEvents', showSyncedView.toString())
    }
  }, [showSyncedView])

  // Load Google Calendar integration status
  useEffect(() => {
    loadIntegrationStatus()
  }, [])

  const loadIntegrationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('id, email, calendar_name, sync_enabled, last_sync_at')
        .single()

      if (!error && data) {
        setGoogleIntegration(data)
      } else {
        setGoogleIntegration(null)
      }
    } catch (err) {
      console.error('Error loading integration:', err)
    } finally {
      setIntegrationLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? This will stop syncing jobs to your calendar.')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setGoogleIntegration(null)
      setShowSyncedView(false)
      setGoogleEvents([])
    } catch (error: any) {
      alert(error.message || 'Failed to disconnect Google Calendar')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleManualSync = async () => {
    if (!googleIntegration) return

    setLoadingEvents(true)
    try {
      await loadGoogleCalendarEvents()
      await loadIntegrationStatus() // Refresh the last sync time
    } finally {
      setLoadingEvents(false)
    }
  }

  // Fetch Google Calendar events
  const loadGoogleCalendarEvents = async () => {
    if (!googleIntegration || !showSyncedView) {
      setGoogleEvents([])
      return
    }

    setLoadingEvents(true)
    try {
      // Get start and end of the current calendar view (month)
      const start = moment(currentDate).startOf('month').subtract(7, 'days')
      const end = moment(currentDate).endOf('month').add(7, 'days')

      const response = await fetch(
        `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setGoogleEvents(data.events || [])
      } else {
        console.error('Failed to fetch Google Calendar events')
        setGoogleEvents([])
      }
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      setGoogleEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  // Load Google Calendar events when synced view is enabled or date changes
  useEffect(() => {
    if (showSyncedView && googleIntegration) {
      loadGoogleCalendarEvents()
    } else {
      setGoogleEvents([])
    }
  }, [showSyncedView, googleIntegration, currentDate])

  // Auto-refresh Google Calendar events every 60 seconds
  useEffect(() => {
    if (!showSyncedView || !googleIntegration) return

    const interval = setInterval(() => {
      loadGoogleCalendarEvents()
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(interval)
  }, [showSyncedView, googleIntegration, currentDate])

  // Convert jobs and Google events to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    // CRM jobs
    const jobEvents: CalendarEvent[] = jobs.map((job) => ({
      id: job.id,
      title: `${job.customer.name} - ${job.service.name}`,
      start: new Date(job.booking_datetime),
      end: new Date(new Date(job.booking_datetime).getTime() + (job.service.duration_hours || 2) * 60 * 60 * 1000),
      job,
      isGoogleEvent: false,
    }))

    // Google Calendar events (only if synced view is enabled)
    const googleCalendarEvents: CalendarEvent[] = showSyncedView
      ? googleEvents.map((event) => {
          const start = event.start?.dateTime || event.start?.date
          const end = event.end?.dateTime || event.end?.date

          return {
            id: `google-${event.id}`,
            title: event.summary || '(No title)',
            start: new Date(start),
            end: new Date(end),
            isGoogleEvent: true,
            googleEventData: event,
          }
        })
      : []

    return [...jobEvents, ...googleCalendarEvents]
  }, [jobs, showSyncedView, googleEvents])

  // Handle event click (view/edit job or show Google event info)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.isGoogleEvent) {
      setSelectedGoogleEvent(event.googleEventData)
    } else if (event.job) {
      setSelectedJob(event.job)
    }
  }, [])

  // Handle slot selection (create new job)
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo)
    setCreateDialogOpen(true)
  }, [])

  // Custom event style based on pipeline stage or event type
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.isGoogleEvent) {
      // Style for Google Calendar events - grey with pattern
      const style = {
        backgroundColor: '#9ca3af',
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '2px dashed white',
        display: 'block',
        fontSize: '12px',
        padding: '4px 6px',
        fontStyle: 'italic',
      }
      return { style }
    }

    // Style for CRM jobs
    const style = {
      backgroundColor: event.job!.pipeline_stage.color,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '13px',
      padding: '4px 6px',
    }
    return { style }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 lg:px-6 py-4">
        <div className="flex items-start justify-between flex-col lg:flex-row gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#32373c' }}>
              Job Calendar
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">
              View and manage job bookings
            </p>
          </div>

          {/* Google Calendar Sync Status */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 w-full lg:min-w-[300px] lg:w-auto">
            {integrationLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : googleIntegration ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Google Calendar Connected
                  </div>
                  <div className="text-xs text-gray-600">
                    {googleIntegration.email}
                  </div>
                  {googleIntegration.last_sync_at && (
                    <div className="text-xs text-gray-500">
                      Last synced: {formatDistanceToNow(new Date(googleIntegration.last_sync_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={loadingEvents}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    title="Sync now"
                  >
                    <RefreshCw className={cn("h-4 w-4", loadingEvents && "animate-spin")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Not Connected
                  </div>
                  <div className="text-xs text-gray-600">
                    Connect in Settings to sync jobs
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toggle for Synced View */}
        {googleIntegration && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Show Google Calendar Events
                </div>
                <div className="text-xs text-gray-600">
                  {showSyncedView
                    ? 'Displaying both CRM jobs and personal Google events'
                    : 'Showing CRM jobs only'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingEvents && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              <Switch
                checked={showSyncedView}
                onCheckedChange={setShowSyncedView}
                aria-label="Toggle synced view"
              />
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden bg-white p-2 lg:p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onNavigate={(date) => setCurrentDate(date)}
          selectable
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
          }}
          popup
        />
      </div>

      {/* Create Job Dialog */}
      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setSelectedSlot(null)
        }}
        onJobCreated={async (job) => {
          setCreateDialogOpen(false)
          setSelectedSlot(null)
          // Reload jobs from server to get full related data
          const supabase = createClient()
          const { data } = await supabase
            .from('jobs')
            .select(`
              *,
              customer:customers(*),
              car:cars(*),
              service:services(*),
              pipeline_stage:pipeline_stages(*)
            `)
            .order('booking_datetime', { ascending: true })

          if (data) {
            setJobs(data as any)
          }
        }}
        defaultDate={selectedSlot?.start}
      />

      {/* Edit Job Dialog */}
      <EditJobDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null)
        }}
        onJobUpdated={async () => {
          setSelectedJob(null)
          // Reload jobs from server without page refresh
          const supabase = createClient()
          const { data } = await supabase
            .from('jobs')
            .select(`
              *,
              customer:customers(*),
              car:cars(*),
              service:services(*),
              pipeline_stage:pipeline_stages(*)
            `)
            .order('booking_datetime', { ascending: true })

          if (data) {
            setJobs(data as any)
          }
        }}
      />

      {/* Google Calendar Event Details Dialog */}
      <Dialog open={!!selectedGoogleEvent} onOpenChange={(open) => {
        if (!open) setSelectedGoogleEvent(null)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Google Calendar Event
            </DialogTitle>
            <DialogDescription>
              This is a personal event from your Google Calendar
            </DialogDescription>
          </DialogHeader>

          {selectedGoogleEvent && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {selectedGoogleEvent.summary || '(No title)'}
                </h3>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedGoogleEvent.start?.dateTime
                      ? format(new Date(selectedGoogleEvent.start.dateTime), 'PPP')
                      : selectedGoogleEvent.start?.date
                        ? format(new Date(selectedGoogleEvent.start.date), 'PPP')
                        : 'No date'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedGoogleEvent.start?.dateTime && selectedGoogleEvent.end?.dateTime ? (
                      <>
                        {format(new Date(selectedGoogleEvent.start.dateTime), 'p')}
                        {' - '}
                        {format(new Date(selectedGoogleEvent.end.dateTime), 'p')}
                      </>
                    ) : (
                      'All day'
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              {selectedGoogleEvent.location && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Location</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedGoogleEvent.location}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedGoogleEvent.description && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Description</div>
                    <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {selectedGoogleEvent.description}
                    </div>
                  </div>
                </div>
              )}

              {/* Open in Google Calendar */}
              {selectedGoogleEvent.htmlLink && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(selectedGoogleEvent.htmlLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Calendar
                  </Button>
                </div>
              )}

              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                To edit this event, please use Google Calendar
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          padding: 12px 6px;
          font-weight: 600;
          background-color: #f9fafb;
          border-bottom: 2px solid #d52329 !important;
        }
        .rbc-today {
          background-color: #fef3c7;
        }
        .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-event {
          font-size: 13px;
          position: relative;
        }
        .rbc-event:focus {
          outline: none;
        }
        .rbc-toolbar button {
          color: #32373c;
          border: 1px solid #d1d5db;
          padding: 6px 12px;
          border-radius: 4px;
        }
        .rbc-toolbar button:hover {
          background-color: #f3f4f6;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #d52329;
          color: white;
          border-color: #d52329;
        }
        .rbc-toolbar button.rbc-active:hover {
          background-color: #b91c1c;
        }

        /* Custom tooltip styles */
        .event-with-tooltip {
          position: relative;
        }
        .rbc-event:hover .event-with-tooltip::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background-color: #111827;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10000;
          pointer-events: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .rbc-event:hover .event-with-tooltip::before {
          content: '';
          position: absolute;
          bottom: calc(100% + 2px);
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #111827;
          z-index: 10000;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

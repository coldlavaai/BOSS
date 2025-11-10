import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCalendarEvents, refreshAccessToken } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get proposed time slot from request
    const { startTime, endTime, excludeJobId } = await request.json()

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      )
    }

    const conflicts: any[] = []

    // Check CRM jobs for conflicts
    let jobQuery = supabase
      .from('jobs')
      .select('id, booking_datetime, service:services(name, duration_hours), customer:customers(name)')
      .gte('booking_datetime', new Date(new Date(startTime).getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte('booking_datetime', new Date(endTime).toISOString())

    // Exclude the job being edited
    if (excludeJobId) {
      jobQuery = jobQuery.neq('id', excludeJobId)
    }

    const { data: jobs } = await jobQuery

    // Check each job for time overlap
    if (jobs) {
      for (const job of jobs) {
        const jobStart = new Date(job.booking_datetime)
        const service = job.service as any
        const customer = job.customer as any
        const jobEnd = new Date(
          jobStart.getTime() + (service?.duration_hours || 2) * 60 * 60 * 1000
        )
        const proposedStart = new Date(startTime)
        const proposedEnd = new Date(endTime)

        // Check for overlap
        if (jobStart < proposedEnd && jobEnd > proposedStart) {
          conflicts.push({
            type: 'crm_job',
            title: `${customer?.name} - ${service?.name}`,
            start: jobStart.toISOString(),
            end: jobEnd.toISOString(),
          })
        }
      }
    }

    // Check Google Calendar for conflicts
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)
      .single()

    if (integration) {
      // Check if token needs refresh
      let accessToken = integration.access_token
      const tokenExpiry = new Date(integration.token_expiry)
      const now = new Date()

      if (tokenExpiry <= now) {
        const newTokens = await refreshAccessToken(integration.refresh_token)
        accessToken = newTokens.access_token!

        const newExpiry = newTokens.expiry_date
          ? new Date(newTokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000)

        await supabase
          .from('google_calendar_integrations')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry.toISOString(),
          })
          .eq('id', integration.id)
      }

      // Fetch Google Calendar events for the proposed time range
      const events = await listCalendarEvents(
        accessToken,
        integration.calendar_id,
        new Date(new Date(startTime).getTime() - 12 * 60 * 60 * 1000).toISOString(),
        new Date(endTime).toISOString()
      )

      // Get synced event IDs to exclude them
      const { data: syncedEvents } = await supabase
        .from('synced_calendar_events')
        .select('google_event_id')
        .eq('integration_id', integration.id)

      const syncedEventIds = new Set(
        syncedEvents?.map((e) => e.google_event_id) || []
      )

      // Check each Google event for time overlap
      for (const event of events) {
        // Skip if this is a synced CRM job
        if (syncedEventIds.has(event.id!)) continue

        const eventStart = new Date(
          event.start?.dateTime || event.start?.date || ''
        )
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '')
        const proposedStart = new Date(startTime)
        const proposedEnd = new Date(endTime)

        // Check for overlap
        if (eventStart < proposedEnd && eventEnd > proposedStart) {
          conflicts.push({
            type: 'google_calendar',
            title: event.summary || '(No title)',
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
          })
        }
      }
    }

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
      conflicts,
    })
  } catch (error: any) {
    console.error('Error checking for conflicts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check for conflicts' },
      { status: 500 }
    )
  }
}

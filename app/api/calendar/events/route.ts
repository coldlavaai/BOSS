import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCalendarEvents, refreshAccessToken } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'timeMin and timeMax are required' },
        { status: 400 }
      )
    }

    // Get Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'No active Google Calendar integration found' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expiry)
    const now = new Date()

    if (tokenExpiry <= now) {
      // Token expired, refresh it
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    // Fetch Google Calendar events
    const events = await listCalendarEvents(
      accessToken,
      integration.calendar_id,
      timeMin,
      timeMax
    )

    // Get synced job IDs to filter them out (we don't want duplicates)
    const { data: syncedEvents } = await supabase
      .from('synced_calendar_events')
      .select('google_event_id')
      .eq('integration_id', integration.id)

    const syncedEventIds = new Set(
      syncedEvents?.map((e) => e.google_event_id) || []
    )

    // Filter out events that are already synced from CRM (to avoid duplicates)
    const filteredEvents = events.filter(
      (event) => !syncedEventIds.has(event.id!)
    )

    return NextResponse.json({ events: filteredEvents })
  } catch (error: any) {
    console.error('Error fetching Google Calendar events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

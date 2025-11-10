import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCalendarEvents, refreshAccessToken } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    // Google Calendar sends notifications with specific headers
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const resourceId = request.headers.get('x-goog-resource-id')

    console.log('Webhook received:', { channelId, resourceState, resourceId })

    if (!channelId || !resourceId) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
    }

    // Skip sync state (initial notification when watch is created)
    if (resourceState === 'sync') {
      return NextResponse.json({ success: true, message: 'Sync notification acknowledged' })
    }

    const supabase = await createClient()

    // Find the integration with this channel
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('watch_channel_id', channelId)
      .eq('watch_resource_id', resourceId)
      .single()

    if (!integration) {
      console.warn('No integration found for channel:', channelId)
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    console.log('Integration found, two_way_sync enabled:', integration.two_way_sync_enabled)

    // If two-way sync is enabled, process the changes
    if (integration.two_way_sync_enabled) {
      await processTwoWaySync(supabase, integration)
    }

    // Update last_sync_at to trigger frontend refresh
    await supabase
      .from('google_calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    console.log('Updated last_sync_at for integration:', integration.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processTwoWaySync(supabase: any, integration: any) {
  try {
    console.log('Processing two-way sync for integration:', integration.id)

    // Refresh token if needed
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expiry)
    const now = new Date()

    if (tokenExpiry <= now) {
      const newTokens = await refreshAccessToken(integration.refresh_token)
      accessToken = newTokens.access_token!
    }

    // Get all synced events for this integration
    const { data: syncedEvents } = await supabase
      .from('synced_calendar_events')
      .select('job_id, google_event_id')
      .eq('integration_id', integration.id)

    if (!syncedEvents || syncedEvents.length === 0) {
      console.log('No synced events to update')
      return
    }

    console.log(`Found ${syncedEvents.length} synced events, fetching from Google Calendar...`)

    // Fetch events from Google Calendar for the next 30 days
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 30)

    const googleEvents = await listCalendarEvents(
      accessToken,
      integration.calendar_id,
      timeMin.toISOString(),
      timeMax.toISOString()
    )

    console.log(`Fetched ${googleEvents.length} events from Google Calendar`)

    // Update CRM jobs with changes from Google Calendar
    for (const syncedEvent of syncedEvents) {
      const googleEvent = googleEvents.find(e => e.id === syncedEvent.google_event_id)

      if (googleEvent) {
        // Update job with safe fields only
        const updates: any = {
          last_synced_from_google: new Date().toISOString(),
        }

        // Update date/time if changed
        if (googleEvent.start?.dateTime) {
          updates.booking_datetime = googleEvent.start.dateTime
        }

        // Update notes/description if present
        if (googleEvent.description) {
          updates.notes = googleEvent.description
        }

        console.log(`Updating job ${syncedEvent.job_id} from Google Calendar event`)

        await supabase
          .from('jobs')
          .update(updates)
          .eq('id', syncedEvent.job_id)
      }
    }

    console.log('Two-way sync completed')
  } catch (error) {
    console.error('Error in two-way sync:', error)
    // Don't throw - we don't want to fail the webhook
  }
}

// Handle Google's channel verification
export async function GET(request: NextRequest) {
  // Google may send a verification request during setup
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteCalendarEvent, refreshAccessToken } from '@/lib/google-calendar'

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

    // Get job data from request
    const { jobId, deleteFromCalendar = true } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Check if job exists (no ownership check - once authenticated, you can delete anything)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job lookup error:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If user wants to delete from calendar, check for synced event
    if (deleteFromCalendar) {
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

        // Get synced event
        const { data: syncedEvent } = await supabase
          .from('synced_calendar_events')
          .select('*')
          .eq('job_id', jobId)
          .eq('integration_id', integration.id)
          .single()

        if (syncedEvent && syncedEvent.google_event_id) {
          try {
            // Delete from Google Calendar
            await deleteCalendarEvent(
              accessToken,
              integration.calendar_id,
              syncedEvent.google_event_id
            )

            // Delete sync record
            await supabase
              .from('synced_calendar_events')
              .delete()
              .eq('id', syncedEvent.id)
          } catch (error) {
            console.error('Error deleting from Google Calendar:', error)
            // Continue with database deletion even if calendar deletion fails
          }
        }
      }
    }

    // Delete job from database
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      throw new Error(deleteError.message || 'Failed to delete job from database')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete job' },
      { status: 500 }
    )
  }
}

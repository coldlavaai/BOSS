import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stopWatchChannel, refreshAccessToken } from '@/lib/google-calendar'

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

    // Get Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'No integration found' },
        { status: 404 }
      )
    }

    if (!integration.watch_channel_id || !integration.watch_resource_id) {
      return NextResponse.json(
        { error: 'No active watch channel' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expiry)
    const now = new Date()

    if (tokenExpiry <= now) {
      const newTokens = await refreshAccessToken(integration.refresh_token)
      accessToken = newTokens.access_token!
    }

    // Stop watching calendar
    await stopWatchChannel(
      accessToken,
      integration.watch_channel_id,
      integration.watch_resource_id
    )

    // Clear channel info from database
    await supabase
      .from('google_calendar_integrations')
      .update({
        watch_channel_id: null,
        watch_resource_id: null,
        watch_expiration: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error stopping watch channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop watching calendar' },
      { status: 500 }
    )
  }
}

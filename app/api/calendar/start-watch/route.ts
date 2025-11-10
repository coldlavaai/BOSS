import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startWatchChannel, refreshAccessToken } from '@/lib/google-calendar'

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
        { error: 'No Google Calendar integration found' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expiry)
    const now = new Date()

    if (tokenExpiry <= now) {
      const newTokens = await refreshAccessToken(integration.refresh_token)
      accessToken = newTokens.access_token!

      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: accessToken,
          token_expiry: new Date(newTokens.expiry_date || Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    // Get webhook URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    if (!baseUrl) {
      throw new Error('App URL not configured')
    }

    const webhookUrl = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/calendar/webhook`

    console.log('Starting watch channel with webhook URL:', webhookUrl)

    // Start watch channel
    const watchData = await startWatchChannel(
      accessToken,
      integration.calendar_id,
      webhookUrl
    )

    console.log('Watch channel started:', watchData)

    // Store watch channel info in database
    await supabase
      .from('google_calendar_integrations')
      .update({
        watch_channel_id: watchData.channelId,
        watch_resource_id: watchData.resourceId,
        watch_expiration: watchData.expiration?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      channelId: watchData.channelId,
      expiration: watchData.expiration,
    })
  } catch (error: any) {
    console.error('Error starting watch channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start watch channel' },
      { status: 500 }
    )
  }
}

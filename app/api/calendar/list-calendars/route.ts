import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCalendars, refreshAccessToken } from '@/lib/google-calendar'

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

    // Fetch calendars
    const calendars = await listCalendars(accessToken)

    return NextResponse.json({
      calendars: calendars.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        backgroundColor: cal.backgroundColor,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching calendars:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendars' },
      { status: 500 }
    )
  }
}

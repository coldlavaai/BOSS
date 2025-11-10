import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setupGmailWatch, refreshGmailToken } from '@/lib/integrations/gmail'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Gmail integration not found. Please connect your Gmail account first.' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log('Gmail token expired, refreshing...')
      const tokens = await refreshGmailToken(integration.refresh_token)

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Failed to update Gmail tokens:', updateError)
        throw new Error('Failed to refresh access token')
      }

      accessToken = tokens.access_token
    }

    // Set up Gmail watch
    // The topic name should be in format: projects/YOUR_PROJECT_ID/topics/gmail-notifications
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || 'projects/YOUR_PROJECT_ID/topics/gmail-notifications'

    const { historyId, expiration } = await setupGmailWatch(accessToken, topicName)

    // Update integration with watch details
    const { error: updateError } = await supabase
      .from('email_integrations')
      .update({
        watch_history_id: historyId,
        watch_expiration: new Date(parseInt(expiration)).toISOString(),
      })
      .eq('id', integration.id)

    if (updateError) {
      console.error('Failed to update watch details:', updateError)
      throw new Error('Failed to save watch details')
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail watch notifications enabled',
      historyId,
      expiration: new Date(parseInt(expiration)).toISOString(),
    })
  } catch (error: any) {
    console.error('Error setting up Gmail watch:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set up Gmail watch' },
      { status: 500 }
    )
  }
}

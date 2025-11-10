import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForGmailTokens, getGmailUserProfile, setupGmailWatch } from '@/lib/integrations/gmail'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=gmail_auth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=no_code`
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForGmailTokens(code)

    // Get user profile
    const profile = await getGmailUserProfile(tokens.access_token)

    // Save to database
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=not_authenticated`
      )
    }

    // Calculate token expiration
    const expiresAt = new Date(tokens.expiry_date)

    // Store or update integration
    const { data: integrationData, error: dbError } = await supabase
      .from('email_integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'gmail',
          email_address: profile.email,
          display_name: profile.name,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          provider_user_id: profile.id,
          is_active: true,
          sync_enabled: true,
          last_sync_at: null,
        },
        {
          onConflict: 'user_id,provider,email_address',
        }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Error saving Gmail integration:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=save_failed`
      )
    }

    // Set up Gmail push notifications (watch)
    try {
      const topicName = process.env.GOOGLE_PUBSUB_TOPIC || 'projects/dd-crm-477116/topics/gmail-notifications'
      const { historyId, expiration } = await setupGmailWatch(tokens.access_token, topicName)

      // Update integration with watch details
      await supabase
        .from('email_integrations')
        .update({
          watch_history_id: historyId,
          watch_expiration: new Date(parseInt(expiration)).toISOString(),
        })
        .eq('id', integrationData.id)

      console.log('Gmail watch notifications enabled successfully')
    } catch (watchError) {
      console.error('Error setting up Gmail watch (non-critical):', watchError)
      // Don't fail the entire flow if watch setup fails
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&success=gmail_connected`
    )
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=callback_failed`
    )
  }
}

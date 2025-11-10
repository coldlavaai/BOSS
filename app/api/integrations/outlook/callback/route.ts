import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getOutlookUserProfile } from '@/lib/integrations/outlook'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=outlook_auth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=no_code`
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Get user profile
    const profile = await getOutlookUserProfile(tokens.access_token)

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
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // Store or update integration
    const { error: dbError } = await supabase.from('email_integrations').upsert(
      {
        user_id: user.id,
        provider: 'outlook',
        email_address: profile.mail || profile.userPrincipalName,
        display_name: profile.displayName,
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

    if (dbError) {
      console.error('Error saving Outlook integration:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=save_failed`
      )
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&success=outlook_connected`
    )
  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=callback_failed`
    )
  }
}

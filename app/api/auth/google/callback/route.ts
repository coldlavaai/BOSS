import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTokensFromCode, getUserEmail } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user_id
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=google_auth_denied', request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_callback', request.url)
      )
    }

    const supabase = await createClient()

    // Verify user is authenticated and matches state
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=unauthorized', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google')
    }

    // Get user's Google email
    const googleEmail = await getUserEmail(tokens.access_token)

    if (!googleEmail) {
      throw new Error('Failed to get Google email')
    }

    // Calculate token expiry (tokens.expiry_date is milliseconds since epoch)
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default to 1 hour from now

    // Store or update integration in database
    const { error: dbError } = await supabase
      .from('google_calendar_integrations')
      .upsert(
        {
          user_id: user.id,
          email: googleEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
          calendar_id: 'primary',
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,email',
        }
      )

    if (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&success=google_connected', request.url)
    )
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error)
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${encodeURIComponent(error.message || 'oauth_failed')}`,
        request.url
      )
    )
  }
}

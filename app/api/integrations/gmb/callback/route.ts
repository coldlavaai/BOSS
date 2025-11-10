import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForGmbTokens,
  getGmbUserProfile,
  listGmbAccounts,
  listGmbLocations,
} from '@/lib/integrations/gmb'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=no_code`
      )
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthorized`
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForGmbTokens(code)

    // Get user profile
    const profile = await getGmbUserProfile(tokens.access_token)

    // Get GMB accounts
    const accountsResponse = await listGmbAccounts(tokens.access_token)
    const accounts = accountsResponse.accounts || []

    if (accounts.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=no_gmb_account`
      )
    }

    // Get first account (user can select different location later)
    const accountId = accounts[0].name.split('/')[1]

    // Get locations for the account
    const locations = await listGmbLocations(tokens.access_token, accountId)

    if (locations.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=no_gmb_locations`
      )
    }

    // Use first location (user can change this later)
    const location = locations[0]
    const locationId = location.name.split('/')[3]

    // Calculate token expiration
    const expiresAt = new Date(tokens.expiry_date)

    // Save to database
    const { error: dbError } = await supabase.from('gmb_integrations').upsert({
      user_id: user.id,
      account_id: accountId,
      location_id: locationId,
      business_name: location.locationName || null,
      business_address: location.address
        ? `${location.address.addressLines?.join(', ')}, ${location.address.locality}, ${location.address.administrativeArea} ${location.address.postalCode}`
        : null,
      business_phone: location.primaryPhone || null,
      business_website: location.websiteUri || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token!,
      token_expires_at: expiresAt.toISOString(),
      is_active: true,
    })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=database_error`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&success=gmb_connected`
    )
  } catch (error: any) {
    console.error('Error in GMB callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=${encodeURIComponent(error.message || 'callback_error')}`
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationUrl } from '@/lib/google-calendar'

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

    // Generate auth URL with user ID as state for security
    const authUrl = getAuthorizationUrl(user.id)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getOutlookAuthUrl } from '@/lib/integrations/outlook'

export async function GET(request: NextRequest) {
  try {
    // Use production domain in production, local URL in development
    const baseUrl = process.env.VERCEL_ENV === 'production'
      ? 'https://detail-dynamics-crm.vercel.app'
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const redirectUri = `${baseUrl}/api/integrations/outlook/callback`

    const authUrl = getOutlookAuthUrl(redirectUri)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error initiating Outlook OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Outlook authentication' },
      { status: 500 }
    )
  }
}

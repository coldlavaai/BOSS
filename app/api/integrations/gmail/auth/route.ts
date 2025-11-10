import { NextRequest, NextResponse } from 'next/server'
import { getGmailAuthUrl } from '@/lib/integrations/gmail'

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGmailAuthUrl()

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Gmail authentication' },
      { status: 500 }
    )
  }
}

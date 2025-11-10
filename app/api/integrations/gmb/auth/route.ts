import { NextResponse } from 'next/server'
import { getGmbAuthUrl } from '@/lib/integrations/gmb'

export async function GET() {
  try {
    const authUrl = getGmbAuthUrl()
    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Error generating GMB auth URL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

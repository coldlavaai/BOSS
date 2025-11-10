import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse request body to get integrationId
    const body = await request.json()
    const { integrationId } = body

    if (integrationId) {
      // Delete specific integration by ID
      const { error } = await supabase
        .from('email_integrations')
        .delete()
        .eq('id', integrationId)
        .eq('user_id', user.id)
        .eq('provider', 'gmail')

      if (error) {
        console.error('Error disconnecting Gmail:', error)
        return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 })
      }
    } else {
      // Delete all Gmail integrations (backward compatibility)
      const { error } = await supabase
        .from('email_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'gmail')

      if (error) {
        console.error('Error disconnecting Gmail:', error)
        return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in Gmail disconnect:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

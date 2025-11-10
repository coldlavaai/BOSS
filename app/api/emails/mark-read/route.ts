import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markGmailMessageAsRead, refreshGmailToken } from '@/lib/integrations/gmail'

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

    const body = await request.json()
    const { emailId, isRead = true } = body

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    // Get email thread details
    const { data: emailThread, error: emailError } = await supabase
      .from('email_threads')
      .select('*, integration:email_integrations(*)')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single()

    if (emailError || !emailThread) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Update in database first
    const { error: updateError } = await supabase
      .from('email_threads')
      .update({ is_read: isRead })
      .eq('id', emailId)

    if (updateError) {
      console.error('Error updating email read status in database:', updateError)
      return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
    }

    // If it's a Gmail email and we have integration details, update in Gmail too
    if (emailThread.provider === 'gmail' && emailThread.provider_message_id && emailThread.integration) {
      const integration = emailThread.integration as any

      try {
        // Check if token needs refresh
        let accessToken = integration.access_token
        const tokenExpiresAt = new Date(integration.token_expires_at)
        const now = new Date()

        if (tokenExpiresAt <= now) {
          console.log('Gmail token expired, refreshing...')
          const tokens = await refreshGmailToken(integration.refresh_token)

          // Update tokens in database
          const { error: tokenUpdateError } = await supabase
            .from('email_integrations')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || integration.refresh_token,
              token_expires_at: new Date(tokens.expiry_date).toISOString(),
            })
            .eq('id', integration.id)

          if (!tokenUpdateError) {
            accessToken = tokens.access_token
          }
        }

        // Mark as read in Gmail
        await markGmailMessageAsRead(accessToken, emailThread.provider_message_id, isRead)
        console.log(`✓ Marked email ${isRead ? 'read' : 'unread'} in Gmail`)
      } catch (gmailError: any) {
        console.error('Error updating Gmail read status:', gmailError)
        // Don't fail the request if Gmail update fails
        // The database is already updated
        return NextResponse.json({
          success: true,
          warning: 'Updated in CRM but failed to sync with Gmail',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email marked as ${isRead ? 'read' : 'unread'}`,
    })
  } catch (error: any) {
    console.error('Error marking email as read:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark email as read' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOutlookEmail, refreshOutlookToken } from '@/lib/integrations/outlook'

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

    // Parse request body
    const body = await request.json()
    const { integrationId, to, cc, bcc, subject, body: emailBody, bodyType = 'text' } = body

    if (!integrationId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: integrationId, to, subject, body' },
        { status: 400 }
      )
    }

    // Get integration from database
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .in('provider', ['outlook', 'office365'])
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Outlook integration not found' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      // Token expired, refresh it
      console.log('Outlook token expired, refreshing...')
      const tokens = await refreshOutlookToken(integration.refresh_token)

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Failed to update Outlook tokens:', updateError)
        throw new Error('Failed to refresh access token')
      }

      accessToken = tokens.access_token
    }

    // Send email via Microsoft Graph API
    await sendOutlookEmail(accessToken, {
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject,
      body: emailBody,
      bodyType,
    })

    // TODO: Store sent email in email_threads table
    // This will be added when we implement email sync

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: any) {
    console.error('Error sending Outlook email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

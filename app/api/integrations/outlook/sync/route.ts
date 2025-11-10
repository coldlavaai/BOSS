import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchOutlookMessages,
  refreshOutlookToken,
} from '@/lib/integrations/outlook'

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
    const { integrationId, maxResults = 50 } = body

    if (!integrationId) {
      return NextResponse.json({ error: 'Missing integrationId' }, { status: 400 })
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

    // Fetch emails from Outlook
    const { messages } = await fetchOutlookMessages(accessToken, {
      top: maxResults,
      filter: `receivedDateTime ge ${(integration.sync_from_date ? new Date(integration.sync_from_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString()}`,
    })

    console.log(`Fetched ${messages.length} messages from Outlook`)

    let syncedCount = 0
    let errors = 0

    // Process each message
    for (const message of messages) {
      try {
        // Try to match email to customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', message.from.emailAddress.address)
          .single()

        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('email_threads')
          .select('id')
          .eq('provider_message_id', message.id)
          .single()

        if (!existingEmail) {
          // Insert email into database
          const { error: insertError } = await supabase
            .from('email_threads')
            .insert({
              user_id: user.id,
              integration_id: integration.id,
              provider_message_id: message.id,
              provider_thread_id: message.conversationId || message.id,
              customer_id: customer?.id || null,
              from_email: message.from.emailAddress.address,
              from_name: message.from.emailAddress.name || null,
              to_emails: message.toRecipients.map((r: any) => r.emailAddress.address),
              cc_emails: message.ccRecipients && message.ccRecipients.length > 0
                ? message.ccRecipients.map((r: any) => r.emailAddress.address)
                : null,
              subject: message.subject,
              body_text: message.bodyPreview || null,
              body_html: message.body.contentType === 'html' ? message.body.content : null,
              received_at: message.receivedDateTime,
              is_read: message.isRead,
              direction: 'inbound',
            })

          if (insertError) {
            console.error('Error inserting email:', insertError)
            errors++
          } else {
            syncedCount++
          }
        }
      } catch (error) {
        console.error('Error processing message:', error)
        errors++
      }
    }

    // Update last sync time
    await supabase
      .from('email_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: messages.length,
      errors,
    })
  } catch (error: any) {
    console.error('Error syncing Outlook emails:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync emails' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchGmailMessage,
  parseGmailHeaders,
  extractGmailBody,
  refreshGmailToken,
} from '@/lib/integrations/gmail'
import { google } from 'googleapis'

// Use service role for webhook (no user session)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('[Gmail Webhook] Received notification')

    // Parse the Pub/Sub message
    const body = await request.json()
    console.log('[Gmail Webhook] Body:', JSON.stringify(body).substring(0, 200))

    // Pub/Sub sends messages in this format:
    // { message: { data: "base64encoded", messageId: "...", publishTime: "..." } }
    if (!body.message || !body.message.data) {
      console.log('[Gmail Webhook] Invalid Pub/Sub message format')
      return NextResponse.json({ received: true })
    }

    // Decode the message data
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const notification = JSON.parse(decodedData)

    console.log('[Gmail Webhook] Decoded notification:', notification)

    // The notification contains: { emailAddress, historyId }
    const { emailAddress, historyId } = notification

    if (!emailAddress) {
      console.log('[Gmail Webhook] No email address in notification')
      return NextResponse.json({ received: true })
    }

    // Find the integration for this email address
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('email_integrations')
      .select('*')
      .eq('email_address', emailAddress)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      console.log(`[Gmail Webhook] No active integration found for ${emailAddress}`, integrationError)
      return NextResponse.json({ received: true })
    }

    console.log(`[Gmail Webhook] Found integration for ${emailAddress}`)

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log('[Gmail Webhook] Token expired, refreshing...')
      const tokens = await refreshGmailToken(integration.refresh_token)

      // Update tokens in database
      const { error: updateError } = await supabaseAdmin
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('[Gmail Webhook] Failed to update Gmail tokens:', updateError)
        throw new Error('Failed to refresh access token')
      }

      accessToken = tokens.access_token
      console.log('[Gmail Webhook] Token refreshed successfully')
    }

    // Fetch recent messages (last 10) to catch the new ones
    // Note: Ideally we should use Gmail History API with historyId,
    // but for simplicity we'll fetch recent messages
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    oauth2Client.setCredentials({ access_token: accessToken })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      labelIds: ['INBOX'],
    })

    const messageIds = response.data.messages || []
    let processedCount = 0

    console.log(`[Gmail Webhook] Found ${messageIds.length} messages to process`)

    // Process each message
    for (const msg of messageIds) {
      // Check if we already have this message
      const { data: existingThread } = await supabaseAdmin
        .from('email_threads')
        .select('id')
        .eq('provider_message_id', msg.id!)
        .single()

      if (existingThread) {
        continue // Skip if already exists
      }

      console.log(`[Gmail Webhook] Processing new message: ${msg.id}`)

      // Fetch full message details
      const message = await fetchGmailMessage(accessToken, msg.id!)
      const headers = parseGmailHeaders(message)
      const { text, html } = extractGmailBody(message)

      const isSent = message.labelIds?.includes('SENT') || false
      const isRead = !message.labelIds?.includes('UNREAD')

      // Try to find customer by email
      const emailToCheck = isSent ? headers.to : headers.from
      const emailAddressToMatch = emailToCheck.match(/<(.+?)>/)?.[1] || emailToCheck

      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('email', emailAddressToMatch)
        .single()

      // Skip non-customer emails if sync_all_mail is false
      const syncAllMail = (integration as any).sync_all_mail ?? true
      if (!syncAllMail && !customer) {
        console.log(`[Gmail Webhook] Skipping non-customer email: ${emailAddressToMatch}`)
        continue // Skip this email - not from/to a customer
      }

      // Insert new email thread
      const { error: insertError } = await supabaseAdmin.from('email_threads').insert({
        integration_id: integration.id,
        user_id: integration.user_id,
        customer_id: customer?.id || null,
        provider: 'gmail',
        provider_message_id: message.id,
        provider_thread_id: message.threadId,
        from_email: headers.from.match(/<(.+?)>/)?.[1] || headers.from,
        from_name: headers.from.replace(/<.+?>/, '').trim(),
        to_emails: [headers.to.match(/<(.+?)>/)?.[1] || headers.to],
        cc_emails: headers.cc ? [headers.cc] : [],
        bcc_emails: headers.bcc ? [headers.bcc] : [],
        subject: headers.subject,
        body_text: text || null,
        body_html: html || null,
        is_read: isRead,
        is_sent: isSent,
        sent_at: isSent ? new Date(parseInt(message.internalDate)).toISOString() : null,
        received_at: !isSent ? new Date(parseInt(message.internalDate)).toISOString() : null,
      })

      if (insertError) {
        console.error(`[Gmail Webhook] Error inserting email: ${insertError.message}`)
      } else {
        console.log(`[Gmail Webhook] ✓ Processed new email: ${headers.subject}`)
        processedCount++
      }
    }

    // Update the historyId in the integration
    if (historyId) {
      await supabaseAdmin
        .from('email_integrations')
        .update({ watch_history_id: historyId })
        .eq('id', integration.id)
    }

    console.log(`[Gmail Webhook] Complete - processed ${processedCount} new messages`)
    return NextResponse.json({ received: true, processed: processedCount })
  } catch (error: any) {
    console.error('[Gmail Webhook] Error processing Gmail webhook:', error)
    // Return 200 anyway so Pub/Sub doesn't retry
    return NextResponse.json({ received: true, error: error.message })
  }
}

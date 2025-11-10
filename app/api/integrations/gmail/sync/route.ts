import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGmailMessages,
  refreshGmailToken,
  parseGmailHeaders,
  extractGmailBody,
} from '@/lib/integrations/gmail'

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
    const { maxResults = 50 } = body

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Gmail integration not found. Please connect your Gmail account first.' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log('Gmail token expired, refreshing...')
      const tokens = await refreshGmailToken(integration.refresh_token)

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Failed to update Gmail tokens:', updateError)
        throw new Error('Failed to refresh access token')
      }

      accessToken = tokens.access_token
    }

    // Fetch messages from Gmail
    console.log(`Fetching up to ${maxResults} messages from Gmail...`)
    const { messages } = await fetchGmailMessages(accessToken, {
      maxResults,
      labelIds: ['INBOX'],
    })

    console.log(`Fetched ${messages.length} messages from Gmail`)

    // Process and store messages
    let newCount = 0
    let updatedCount = 0

    for (const message of messages) {
      const headers = parseGmailHeaders(message)
      const { text, html } = extractGmailBody(message)

      // Determine if this is a sent or received email
      const isSent = message.labelIds?.includes('SENT') || false
      const isRead = !message.labelIds?.includes('UNREAD')

      // Try to find customer by email
      const emailToCheck = isSent ? headers.to : headers.from
      const emailAddress = emailToCheck.match(/<(.+?)>/)?.[1] || emailToCheck

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', emailAddress)
        .single()

      // Skip non-customer emails if sync_all_mail is false
      const syncAllMail = (integration as any).sync_all_mail ?? true
      if (!syncAllMail && !customer) {
        continue // Skip this email - not from/to a customer
      }

      // Check if this message already exists
      const { data: existingThread } = await supabase
        .from('email_threads')
        .select('id')
        .eq('provider_message_id', message.id)
        .single()

      const emailData = {
        integration_id: integration.id,
        user_id: user.id,
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
      }

      if (existingThread) {
        // Update existing thread (only update customer_id if we found a customer)
        const updateData: any = { is_read: isRead }
        if (customer?.id) {
          updateData.customer_id = customer.id
        }
        await supabase
          .from('email_threads')
          .update(updateData)
          .eq('id', existingThread.id)
        updatedCount++
      } else {
        // Insert new thread
        await supabase.from('email_threads').insert(emailData)
        newCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${newCount} new messages, ${updatedCount} updated`,
      newCount,
      updatedCount,
      totalProcessed: messages.length,
    })
  } catch (error: any) {
    console.error('Error syncing Gmail inbox:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync Gmail inbox' },
      { status: 500 }
    )
  }
}

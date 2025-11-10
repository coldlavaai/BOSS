import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGmailEmail, refreshGmailToken } from '@/lib/integrations/gmail'
import { sendOutlookEmail, refreshOutlookToken } from '@/lib/integrations/outlook'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, html, templateId, jobId, customerId } = body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // Try to get any active email integration (Gmail or Outlook)
    const { data: integrations, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) // Prefer most recent

    if (integrationError || !integrations || integrations.length === 0) {
      console.error('No email integration found:', integrationError)

      // Log failed send
      if (templateId) {
        await supabase.from('email_automation_logs').insert({
          template_id: templateId,
          job_id: jobId || null,
          customer_id: customerId || null,
          status: 'failed',
          error_message: 'No email integration connected. Please connect Gmail or Outlook in Settings.',
          sent_to: [to],
        })
      }

      return NextResponse.json(
        { error: 'No email integration connected. Please connect Gmail or Outlook in Settings.' },
        { status: 400 }
      )
    }

    // Use the first active integration (Gmail preferred, then Outlook)
    const gmailIntegration = integrations.find(i => i.provider === 'gmail')
    const outlookIntegration = integrations.find(i => i.provider === 'outlook')
    const integration = gmailIntegration || outlookIntegration!

    console.log(`[Automation] Using ${integration.provider} integration (${integration.email_address})`)

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log(`${integration.provider} token expired, refreshing...`)

      try {
        if (integration.provider === 'gmail') {
          const tokens = await refreshGmailToken(integration.refresh_token)

          await supabase
            .from('email_integrations')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || integration.refresh_token,
              token_expires_at: new Date(tokens.expiry_date).toISOString(),
            })
            .eq('id', integration.id)

          accessToken = tokens.access_token
        } else if (integration.provider === 'outlook') {
          const tokens = await refreshOutlookToken(integration.refresh_token)

          await supabase
            .from('email_integrations')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            })
            .eq('id', integration.id)

          accessToken = tokens.access_token
        }
      } catch (refreshError: any) {
        console.error('Failed to refresh token:', refreshError)
        throw new Error('Failed to refresh access token')
      }
    }

    // Send email via the appropriate provider
    try {
      if (integration.provider === 'gmail') {
        await sendGmailEmail(accessToken, {
          to: [to],
          subject,
          body: html,
          bodyType: 'html',
        })
      } else if (integration.provider === 'outlook') {
        await sendOutlookEmail(accessToken, {
          to: [to],
          subject,
          body: html,
          bodyType: 'HTML',
        })
      }

      console.log(`[Automation] Email sent successfully via ${integration.provider} to ${to}`)

      // Log successful send to database
      if (templateId) {
        await supabase.from('email_automation_logs').insert({
          template_id: templateId,
          job_id: jobId || null,
          customer_id: customerId || null,
          status: 'sent',
          sent_to: [to],
          sent_at: new Date().toISOString(),
        })
      }

      // Also store in email_threads for customer history
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', to)
        .single()

      await supabase.from('email_threads').insert({
        integration_id: integration.id,
        user_id: user.id,
        customer_id: customer?.id || null,
        provider: integration.provider,
        provider_message_id: `automated-${Date.now()}`,
        from_email: integration.email_address,
        from_name: integration.display_name,
        to_emails: [to],
        subject,
        body_html: html,
        is_read: true,
        is_sent: true,
        sent_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: `Email sent successfully via ${integration.provider}`,
        provider: integration.provider,
      })
    } catch (sendError: any) {
      console.error(`${integration.provider} send error:`, sendError)

      // Log failed send to database
      if (templateId) {
        await supabase.from('email_automation_logs').insert({
          template_id: templateId,
          job_id: jobId || null,
          customer_id: customerId || null,
          status: 'failed',
          error_message: sendError.message,
          sent_to: [to],
        })
      }

      return NextResponse.json(
        { error: sendError.message || `Failed to send email via ${integration.provider}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

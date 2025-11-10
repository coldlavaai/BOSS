import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGmailEmail, refreshGmailToken } from '@/lib/integrations/gmail'

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
    const requestBody = await request.json()
    const { jobId } = requestBody

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    // Get GMB integration
    const { data: gmbIntegration, error: gmbError } = await supabase
      .from('gmb_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (gmbError || !gmbIntegration) {
      return NextResponse.json(
        { error: 'GMB integration not found' },
        { status: 404 }
      )
    }

    if (!gmbIntegration.auto_review_request_enabled) {
      return NextResponse.json(
        { error: 'Auto review requests are disabled' },
        { status: 400 }
      )
    }

    // Get Gmail integration for sending email
    const { data: emailIntegration, error: emailError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (emailError || !emailIntegration) {
      return NextResponse.json(
        { error: 'Gmail integration not found. Please connect Gmail first.' },
        { status: 404 }
      )
    }

    // Get job details with customer
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        service:services(*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.customer?.email) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      )
    }

    // Check if review request already sent
    const { data: existingRequest } = await supabase
      .from('review_requests')
      .select('id')
      .eq('job_id', jobId)
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Review request already sent for this job' },
        { status: 400 }
      )
    }

    // Generate review URL
    const reviewUrl = `https://search.google.com/local/writereview?placeid=${gmbIntegration.location_id}`

    // Check if Gmail token needs refresh
    let accessToken = emailIntegration.access_token
    const tokenExpiresAt = new Date(emailIntegration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log('Gmail token expired, refreshing...')
      const tokens = await refreshGmailToken(emailIntegration.refresh_token)

      await supabase
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || emailIntegration.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        })
        .eq('id', emailIntegration.id)

      accessToken = tokens.access_token
    }

    // Compose review request email
    const subject = `How was your experience with ${gmbIntegration.business_name || 'us'}?`
    const body = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hi ${job.customer.name},</h2>

          <p>Thank you for choosing ${gmbIntegration.business_name || 'us'} for your ${job.service?.name || 'service'}!</p>

          <p>We hope you're happy with the work we completed on ${new Date(job.booking_datetime).toLocaleDateString()}. Your feedback is incredibly valuable to us and helps other customers make informed decisions.</p>

          <p>Would you mind taking a moment to share your experience with a review?</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="background-color: #d52329; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Leave a Review
            </a>
          </div>

          <p>It only takes a minute and would mean the world to us.</p>

          <p>Thank you again for your business!</p>

          <p>Best regards,<br>${gmbIntegration.business_name || 'The Team'}</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

          <p style="font-size: 12px; color: #666;">
            ${gmbIntegration.business_address || ''}<br>
            ${gmbIntegration.business_phone || ''}<br>
            ${gmbIntegration.business_website || ''}
          </p>
        </body>
      </html>
    `

    // Send email via Gmail
    await sendGmailEmail(accessToken, {
      to: [job.customer.email],
      subject,
      body,
      bodyType: 'html',
    })

    // Record review request in database
    const { error: insertError } = await supabase.from('review_requests').insert({
      user_id: user.id,
      integration_id: gmbIntegration.id,
      customer_id: job.customer.id,
      job_id: jobId,
      review_url: reviewUrl,
      email_sent_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to record review request:', insertError)
      // Don't fail the request, email was sent successfully
    }

    return NextResponse.json({ success: true, message: 'Review request sent successfully' })
  } catch (error: any) {
    console.error('Error sending review request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send review request' },
      { status: 500 }
    )
  }
}

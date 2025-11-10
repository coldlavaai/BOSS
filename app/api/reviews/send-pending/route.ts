import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        { message: 'Auto review requests are disabled' },
        { status: 200 }
      )
    }

    // Get all completed jobs that don't have review requests yet
    // Only get jobs completed within the review request delay window
    const delayHours = gmbIntegration.review_request_delay_hours || 24
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - delayHours)

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        service:services(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'Completed')
      .gte('booking_datetime', cutoffDate.toISOString())
      .order('booking_datetime', { ascending: false })

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs found', sent: 0 })
    }

    // Get existing review requests to filter out
    const { data: existingRequests } = await supabase
      .from('review_requests')
      .select('job_id')
      .eq('user_id', user.id)

    const existingJobIds = new Set(existingRequests?.map((r) => r.job_id) || [])

    // Filter jobs that don't have review requests and have customer emails
    const pendingJobs = jobs.filter(
      (job) => !existingJobIds.has(job.id) && job.customer?.email
    )

    if (pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs found', sent: 0 })
    }

    let sent = 0
    let errors = 0

    // Send review requests for each pending job
    for (const job of pendingJobs) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/reviews/send-request`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('Cookie') || '',
            },
            body: JSON.stringify({ jobId: job.id }),
          }
        )

        if (response.ok) {
          sent++
        } else {
          console.error(`Failed to send review request for job ${job.id}`)
          errors++
        }
      } catch (error) {
        console.error(`Error sending review request for job ${job.id}:`, error)
        errors++
      }

      // Add small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      sent,
      errors,
      total: pendingJobs.length,
    })
  } catch (error: any) {
    console.error('Error sending pending review requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send pending review requests' },
      { status: 500 }
    )
  }
}

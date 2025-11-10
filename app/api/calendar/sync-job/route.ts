import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent,
  updateCalendarEvent,
  refreshAccessToken,
} from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('Sync attempt without authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job data from request
    const { jobId } = await request.json()

    if (!jobId) {
      console.error('Sync attempt without job ID')
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    console.log(`Starting sync for job ${jobId}`)

    // Get Google Calendar integration for this user
    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)
      .single()

    if (integrationError || !integration) {
      console.error('No Google Calendar integration found for user:', user.id, integrationError)
      return NextResponse.json(
        { error: 'No active Google Calendar integration found' },
        { status: 404 }
      )
    }

    console.log(`Found integration for calendar: ${integration.calendar_id}`)

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expiry)
    const now = new Date()

    if (tokenExpiry <= now) {
      // Token expired, refresh it
      const newTokens = await refreshAccessToken(integration.refresh_token)
      accessToken = newTokens.access_token!

      // Update tokens in database
      const newExpiry = newTokens.expiry_date
        ? new Date(newTokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000)

      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    // Fetch job details - split into separate queries for reliability
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job fetch error:', jobError)
      return NextResponse.json({ error: 'Job not found', details: jobError }, { status: 404 })
    }

    console.log(`Job found: ${job.id}, fetching related data...`)

    // Fetch related data separately to avoid join issues
    const [customerRes, carRes, serviceRes] = await Promise.all([
      supabase.from('customers').select('id, name, phone, email, address').eq('id', job.customer_id).single(),
      supabase.from('cars').select('id, make, model, year, registration_plate').eq('id', job.car_id).single(),
      supabase.from('services').select('name, duration_hours').eq('id', job.service_id).single(),
    ])

    const customer = customerRes.data
    const car = carRes.data
    const service = serviceRes.data

    console.log(`Related data fetched - Customer: ${customer?.name}, Service: ${service?.name}`)

    // Check if job is already synced
    const { data: existingSync } = await supabase
      .from('synced_calendar_events')
      .select('*')
      .eq('job_id', jobId)
      .eq('integration_id', integration.id)
      .single()

    // Prepare event data
    const carDetails = car
      ? `${car.make} ${car.model} (${car.registration_plate || 'No reg'})`
      : undefined

    // Calculate end date based on service duration
    const startDate = new Date(job.booking_datetime)
    const durationHours = service?.duration_hours || 2 // Default to 2 hours if not specified
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000)

    const eventData = {
      title: `${service?.name || 'Job'} - ${customer?.name || 'Customer'}`,
      description: job.notes || undefined,
      startDate: job.booking_datetime,
      endDate: endDate.toISOString(),
      location: customer?.address || undefined,
      customerName: customer?.name,
      carDetails,
    }

    console.log(`Prepared event data:`, eventData)

    let googleEvent

    if (existingSync && existingSync.google_event_id) {
      // Update existing event
      console.log(`Updating existing Google Calendar event: ${existingSync.google_event_id}`)
      googleEvent = await updateCalendarEvent(
        accessToken,
        integration.calendar_id,
        existingSync.google_event_id,
        eventData
      )
      console.log(`Successfully updated event`)
    } else {
      // Create new event
      console.log(`Creating new Google Calendar event`)
      googleEvent = await createCalendarEvent(
        accessToken,
        integration.calendar_id,
        eventData
      )
      console.log(`Successfully created event: ${googleEvent.id}`)

      // Store sync record
      await supabase.from('synced_calendar_events').insert({
        integration_id: integration.id,
        job_id: jobId,
        google_event_id: googleEvent.id!,
      })
    }

    // Update last_sync_at
    await supabase
      .from('google_calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    console.log(`Sync complete for job ${jobId}`)

    return NextResponse.json({
      success: true,
      eventId: googleEvent.id,
      eventLink: googleEvent.htmlLink,
    })
  } catch (error: any) {
    console.error('Error syncing job to Google Calendar:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync job' },
      { status: 500 }
    )
  }
}

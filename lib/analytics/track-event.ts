import { createClient } from '@/lib/supabase/client'

export type EventType =
  // User actions
  | 'job_created'
  | 'job_updated'
  | 'job_deleted'
  | 'customer_created'
  | 'customer_updated'
  | 'car_created'
  | 'registration_completed'
  | 'login_success'
  | 'login_failed'

  // System events
  | 'calendar_sync_started'
  | 'calendar_sync_completed'
  | 'calendar_sync_failed'

  // Performance
  | 'page_load'
  | 'api_request'

export type EventCategory = 'user_action' | 'system_event' | 'error' | 'performance'

interface TrackEventOptions {
  eventType: EventType
  category: EventCategory
  data?: Record<string, any>
  durationMs?: number
  success?: boolean
  errorMessage?: string
}

/**
 * Track an event for analytics and monitoring
 *
 * @example
 * ```typescript
 * // Track job creation
 * const startTime = Date.now()
 * await createJob(jobData)
 * await trackEvent({
 *   eventType: 'job_created',
 *   category: 'user_action',
 *   durationMs: Date.now() - startTime,
 *   data: { service_id: jobData.service_id, has_addons: true }
 * })
 * ```
 */
export async function trackEvent(options: TrackEventOptions): Promise<void> {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Get page path
    const pagePath = typeof window !== 'undefined' ? window.location.pathname : null

    // Get user agent
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : null

    // Insert event
    await supabase.from('events').insert({
      user_id: user?.id || null,
      event_type: options.eventType,
      event_category: options.category,
      event_data: options.data || null,
      duration_ms: options.durationMs || null,
      page_path: pagePath,
      user_agent: userAgent,
      success: options.success ?? true,
      error_message: options.errorMessage || null,
    })
  } catch (error) {
    // Fail silently - don't break the app if tracking fails
    console.error('Failed to track event:', error)
  }
}

/**
 * Higher-order function to wrap async operations with event tracking
 *
 * @example
 * ```typescript
 * const createJobWithTracking = withEventTracking(
 *   createJob,
 *   'job_created',
 *   'user_action'
 * )
 *
 * await createJobWithTracking(jobData)
 * ```
 */
export function withEventTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  eventType: EventType,
  category: EventCategory
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now()
    let success = true
    let errorMessage: string | undefined

    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      await trackEvent({
        eventType,
        category,
        durationMs: Date.now() - startTime,
        success,
        errorMessage,
      })
    }
  }) as T
}

/**
 * React hook for tracking page views
 *
 * @example
 * ```typescript
 * function MyPage() {
 *   usePageView()
 *   return <div>...</div>
 * }
 * ```
 */
export function usePageView() {
  if (typeof window === 'undefined') return

  const startTime = Date.now()

  // Track page load on mount
  trackEvent({
    eventType: 'page_load',
    category: 'performance',
    durationMs: Date.now() - startTime,
    data: {
      path: window.location.pathname,
    },
  })
}

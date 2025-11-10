import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']
type Job = Database['public']['Tables']['jobs']['Row']
type Service = Database['public']['Tables']['services']['Row']
type Vehicle = Database['public']['Tables']['cars']['Row']
type CompanySettings = Database['public']['Tables']['company_settings']['Row']
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

interface TemplateContext {
  customer?: Customer | null
  job?: Job | null
  service?: Service | null
  vehicle?: Vehicle | null
  pipelineStage?: PipelineStage | null
  company?: CompanySettings | null
  customVariables?: Record<string, any>
}

/**
 * Process an email template and replace all variables with actual data
 */
export function processEmailTemplate(
  template: string,
  context: TemplateContext
): string {
  let processed = template

  // Customer variables
  if (context.customer) {
    processed = processed.replace(/\{\{customer\.name\}\}/g, context.customer.name || '')
    processed = processed.replace(/\{\{customer\.first_name\}\}/g, context.customer.first_name || '')
    processed = processed.replace(/\{\{customer\.last_name\}\}/g, context.customer.last_name || '')
    processed = processed.replace(/\{\{customer\.email\}\}/g, context.customer.email || '')
    processed = processed.replace(/\{\{customer\.phone\}\}/g, context.customer.phone || '')
    processed = processed.replace(/\{\{customer\.business\}\}/g, context.customer.business_name || '')
  }

  // Job variables
  if (context.job) {
    processed = processed.replace(/\{\{job\.id\}\}/g, context.job.id || '')

    // Handle booking_datetime field
    const bookingDate = context.job.booking_datetime ? new Date(context.job.booking_datetime) : null
    processed = processed.replace(/\{\{job\.booking_datetime\}\}/g,
      bookingDate ? bookingDate.toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : ''
    )
    processed = processed.replace(/\{\{job\.booking_date\}\}/g,
      bookingDate ? bookingDate.toLocaleDateString() : ''
    )
    processed = processed.replace(/\{\{job\.booking_time\}\}/g,
      bookingDate ? bookingDate.toLocaleTimeString() : ''
    )

    processed = processed.replace(/\{\{job\.total_price\}\}/g,
      context.job.total_price ? `£${(context.job.total_price / 100).toFixed(2)}` : ''
    )
    processed = processed.replace(/\{\{job\.deposit\}\}/g,
      context.job.deposit_amount ? `£${(context.job.deposit_amount / 100).toFixed(2)}` : ''
    )

    // Job status - use pipeline stage name
    processed = processed.replace(/\{\{job\.status\}\}/g,
      context.pipelineStage?.name || ''
    )
  }

  // Service variables
  if (context.service) {
    processed = processed.replace(/\{\{service\.name\}\}/g, context.service.name || '')

    // Calculate total duration in minutes
    const totalMinutes = (context.service.duration_hours || 0) * 60 + (context.service.duration_minutes || 0)
    processed = processed.replace(/\{\{service\.duration\}\}/g,
      totalMinutes ? `${totalMinutes} minutes` : ''
    )

    // TEMPORARILY DISABLED - needs update for service_pricing table
    // For service.price, use the job's base_price if available
    // TODO: Rewrite for service_pricing table schema
    processed = processed.replace(/\{\{service\.price\}\}/g, 'Contact for pricing')
  }

  // Vehicle variables
  if (context.vehicle) {
    processed = processed.replace(/\{\{vehicle\.make\}\}/g, context.vehicle.make || '')
    processed = processed.replace(/\{\{vehicle\.model\}\}/g, context.vehicle.model || '')
    processed = processed.replace(/\{\{vehicle\.year\}\}/g, context.vehicle.year?.toString() || '')
    processed = processed.replace(/\{\{vehicle\.registration\}\}/g, context.vehicle.registration_plate || '')
  }

  // Company variables
  if (context.company) {
    processed = processed.replace(/\{\{company\.name\}\}/g, context.company.company_name || '')
    processed = processed.replace(/\{\{company\.email\}\}/g, context.company.company_email || '')
    processed = processed.replace(/\{\{company\.phone\}\}/g, context.company.company_phone || '')
    processed = processed.replace(/\{\{company\.address\}\}/g, context.company.company_address || '')
    processed = processed.replace(/\{\{company\.website\}\}/g, context.company.company_website || '')
  }

  // Custom variables
  if (context.customVariables) {
    Object.entries(context.customVariables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{custom\\.${key}\\}\\}`, 'g')
      processed = processed.replace(pattern, String(value || ''))
    })
  }

  return processed
}

/**
 * Extract variable keys from a template string
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match

  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1])
  }

  return [...new Set(matches)]
}

/**
 * Validate that all required context is available for a template
 */
export function validateTemplateContext(
  template: string,
  context: TemplateContext
): { valid: boolean; missingVariables: string[] } {
  const variables = extractVariables(template)
  const missing: string[] = []

  variables.forEach(variable => {
    const [category, field] = variable.split('.')

    switch (category) {
      case 'customer':
        if (!context.customer) missing.push(variable)
        break
      case 'job':
        if (!context.job) missing.push(variable)
        break
      case 'service':
        if (!context.service) missing.push(variable)
        break
      case 'vehicle':
        if (!context.vehicle) missing.push(variable)
        break
      case 'company':
        if (!context.company) missing.push(variable)
        break
      case 'custom':
        if (!context.customVariables || !(field in context.customVariables)) {
          missing.push(variable)
        }
        break
    }
  })

  return {
    valid: missing.length === 0,
    missingVariables: missing,
  }
}

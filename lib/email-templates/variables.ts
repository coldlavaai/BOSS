/**
 * Email Template Variable System
 *
 * This module defines all available variables for email templates including:
 * - Customer variables
 * - Job variables
 * - Service variables
 * - Company variables
 * - Custom user-defined variables
 */

export interface VariableDefinition {
  key: string
  label: string
  description: string
  category: VariableCategory
  example: string
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency'
  format?: string // For dates and currency
}

export type VariableCategory =
  | 'customer'
  | 'job'
  | 'service'
  | 'company'
  | 'custom'
  | 'system'

export interface VariableCategoryInfo {
  label: string
  description: string
  icon: string
}

/**
 * Standard variable categories
 */
export const VARIABLE_CATEGORIES: Record<string, VariableCategoryInfo> = {
  customer: {
    label: 'Customer',
    description: 'Customer information and contact details',
    icon: 'User',
  },
  job: {
    label: 'Job',
    description: 'Job booking and service details',
    icon: 'Briefcase',
  },
  service: {
    label: 'Service',
    description: 'Service information and pricing',
    icon: 'Wrench',
  },
  company: {
    label: 'Company',
    description: 'Your company information',
    icon: 'Building',
  },
  system: {
    label: 'System',
    description: 'System-generated values like dates and times',
    icon: 'Settings',
  },
  custom: {
    label: 'Custom',
    description: 'User-defined custom variables',
    icon: 'Plus',
  },
}

/**
 * All standard variables available in templates
 */
export const STANDARD_VARIABLES: VariableDefinition[] = [
  // Customer Variables
  {
    key: 'customer.name',
    label: 'Customer Name',
    description: 'Full name of the customer',
    category: 'customer',
    example: 'John Smith',
    dataType: 'string',
  },
  {
    key: 'customer.first_name',
    label: 'Customer First Name',
    description: 'First name extracted from customer name',
    category: 'customer',
    example: 'John',
    dataType: 'string',
  },
  {
    key: 'customer.email',
    label: 'Customer Email',
    description: 'Customer email address',
    category: 'customer',
    example: 'john@example.com',
    dataType: 'string',
  },
  {
    key: 'customer.phone',
    label: 'Customer Phone',
    description: 'Customer phone number',
    category: 'customer',
    example: '+44 123 456 7890',
    dataType: 'string',
  },
  {
    key: 'customer.address',
    label: 'Customer Address',
    description: 'Customer full address',
    category: 'customer',
    example: '123 Main St, London, UK',
    dataType: 'string',
  },
  {
    key: 'customer.business_name',
    label: 'Business Name',
    description: 'Customer business or company name',
    category: 'customer',
    example: 'ABC Corp Ltd',
    dataType: 'string',
  },

  // Job Variables
  {
    key: 'job.id',
    label: 'Job ID',
    description: 'Unique job reference number',
    category: 'job',
    example: 'JOB-12345',
    dataType: 'string',
  },
  {
    key: 'job.booking_date',
    label: 'Booking Date',
    description: 'Date of the job booking',
    category: 'job',
    example: 'Monday, 15th January 2025',
    dataType: 'date',
    format: 'EEEE, do MMMM yyyy',
  },
  {
    key: 'job.booking_time',
    label: 'Booking Time',
    description: 'Time of the job booking',
    category: 'job',
    example: '2:30 PM',
    dataType: 'date',
    format: 'h:mm a',
  },
  {
    key: 'job.booking_datetime',
    label: 'Booking Date & Time',
    description: 'Full date and time of booking',
    category: 'job',
    example: 'Monday, 15th January 2025 at 2:30 PM',
    dataType: 'date',
    format: 'EEEE, do MMMM yyyy \'at\' h:mm a',
  },
  {
    key: 'job.status',
    label: 'Job Status',
    description: 'Current status of the job',
    category: 'job',
    example: 'Confirmed',
    dataType: 'string',
  },
  {
    key: 'job.description',
    label: 'Job Description',
    description: 'Description or notes about the job',
    category: 'job',
    example: 'Annual boiler service',
    dataType: 'string',
  },
  {
    key: 'job.total_price',
    label: 'Total Price',
    description: 'Total price for the job',
    category: 'job',
    example: '£125.00',
    dataType: 'currency',
    format: 'GBP',
  },
  {
    key: 'job.deposit',
    label: 'Deposit Amount',
    description: 'Deposit amount required',
    category: 'job',
    example: '£50.00',
    dataType: 'currency',
    format: 'GBP',
  },
  {
    key: 'job.balance',
    label: 'Balance Due',
    description: 'Remaining balance to be paid',
    category: 'job',
    example: '£75.00',
    dataType: 'currency',
    format: 'GBP',
  },
  {
    key: 'job.address',
    label: 'Job Address',
    description: 'Address where job will be performed',
    category: 'job',
    example: '123 Main St, London',
    dataType: 'string',
  },

  // Service Variables
  {
    key: 'service.name',
    label: 'Service Name',
    description: 'Name of the service being provided',
    category: 'service',
    example: 'Boiler Service',
    dataType: 'string',
  },
  {
    key: 'service.description',
    label: 'Service Description',
    description: 'Full description of the service',
    category: 'service',
    example: 'Complete annual boiler service including safety checks',
    dataType: 'string',
  },
  {
    key: 'service.duration',
    label: 'Service Duration',
    description: 'Expected duration of the service',
    category: 'service',
    example: '2 hours',
    dataType: 'number',
  },
  {
    key: 'service.price',
    label: 'Service Price',
    description: 'Base price of the service',
    category: 'service',
    example: '£125.00',
    dataType: 'currency',
    format: 'GBP',
  },

  // Company Variables
  {
    key: 'company.name',
    label: 'Company Name',
    description: 'Your company name',
    category: 'company',
    example: 'Detail Dynamics',
    dataType: 'string',
  },
  {
    key: 'company.email',
    label: 'Company Email',
    description: 'Your company email address',
    category: 'company',
    example: 'info@detaildynamics.uk',
    dataType: 'string',
  },
  {
    key: 'company.phone',
    label: 'Company Phone',
    description: 'Your company phone number',
    category: 'company',
    example: '+44 123 456 7890',
    dataType: 'string',
  },
  {
    key: 'company.address',
    label: 'Company Address',
    description: 'Your company address',
    category: 'company',
    example: '123 Business Park, London, UK',
    dataType: 'string',
  },
  {
    key: 'company.website',
    label: 'Company Website',
    description: 'Your company website URL',
    category: 'company',
    example: 'www.detaildynamics.uk',
    dataType: 'string',
  },

  // System Variables
  {
    key: 'system.today_date',
    label: 'Today\'s Date',
    description: 'Current date when email is sent',
    category: 'system',
    example: 'Monday, 15th January 2025',
    dataType: 'date',
    format: 'EEEE, do MMMM yyyy',
  },
  {
    key: 'system.current_time',
    label: 'Current Time',
    description: 'Current time when email is sent',
    category: 'system',
    example: '2:30 PM',
    dataType: 'date',
    format: 'h:mm a',
  },
  {
    key: 'system.current_year',
    label: 'Current Year',
    description: 'Current year',
    category: 'system',
    example: '2025',
    dataType: 'number',
  },
]

/**
 * Get variables by category
 */
export function getVariablesByCategory(category: VariableCategory): VariableDefinition[] {
  return STANDARD_VARIABLES.filter(v => v.category === category)
}

/**
 * Get variable definition by key
 */
export function getVariableByKey(key: string): VariableDefinition | undefined {
  return STANDARD_VARIABLES.find(v => v.key === key)
}

/**
 * Format variable for insertion into template
 * Variables use handlebars-style syntax: {{variable.key}}
 */
export function formatVariableForTemplate(key: string): string {
  return `{{${key}}}`
}

/**
 * Extract all variables from a template string
 */
export function extractVariablesFromTemplate(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match

  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1])
  }

  return matches
}

/**
 * Validate that all variables in template exist
 */
export function validateTemplateVariables(
  template: string,
  customVariables: Array<{ key: string }> = []
): { valid: boolean; unknownVariables: string[] } {
  const usedVariables = extractVariablesFromTemplate(template)
  const allValidKeys = [
    ...STANDARD_VARIABLES.map(v => v.key),
    ...customVariables.map(v => v.key),
  ]

  const unknownVariables = usedVariables.filter(key => !allValidKeys.includes(key))

  return {
    valid: unknownVariables.length === 0,
    unknownVariables,
  }
}

/**
 * Replace variables in template with actual values
 */
export function replaceVariables(
  template: string,
  data: Record<string, any>
): string {
  let result = template

  // Replace all {{variable}} with actual values
  const regex = /\{\{([^}]+)\}\}/g

  result = result.replace(regex, (match, key) => {
    // Support nested keys like customer.name
    const keys = key.trim().split('.')
    let value: any = data

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return match // Keep original if not found
      }
    }

    // Format based on data type
    if (value === null || value === undefined) {
      return ''
    }

    // Handle dates
    if (value instanceof Date) {
      const varDef = getVariableByKey(key.trim())
      if (varDef?.format) {
        // In real implementation, use date-fns format
        return value.toLocaleDateString()
      }
      return value.toISOString()
    }

    // Handle currency
    if (typeof value === 'number') {
      const varDef = getVariableByKey(key.trim())
      if (varDef?.dataType === 'currency') {
        return `£${value.toFixed(2)}`
      }
      return value.toString()
    }

    return String(value)
  })

  return result
}

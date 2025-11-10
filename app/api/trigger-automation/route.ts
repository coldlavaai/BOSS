import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processEmailTemplate } from '@/lib/email-templates/processor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { triggerType, jobId, customerId } = body

    if (!triggerType || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields: triggerType, jobId' },
        { status: 400 }
      )
    }

    // Fetch active automation rules for this trigger type
    const { data: rules, error: rulesError } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('trigger_type', triggerType)
      .eq('is_active', true)
      .eq('user_id', user.id)

    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules for this trigger', emailsSent: 0 })
    }

    // Fetch job details with related data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers (*),
        service:services (*),
        car:cars (*),
        pipeline_stage:pipeline_stages (*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Fetch company settings
    const { data: company } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Fetch custom variables
    const { data: customVars } = await supabase
      .from('custom_variables')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Build custom variables object
    const customVariables: Record<string, any> = {}
    if (customVars) {
      customVars.forEach(v => {
        customVariables[v.key] = v.default_value || ''
      })
    }

    const emailsSent = []
    const errors = []

    // Process each rule
    for (const rule of rules) {
      try {
        // Fetch the template
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', rule.template_id)
          .single()

        if (templateError || !template) {
          errors.push(`Template not found for rule ${rule.id}`)
          continue
        }

        // Process template with context
        const context = {
          customer: job.customer,
          job,
          service: job.service,
          vehicle: job.car,
          pipelineStage: job.pipeline_stage,
          company,
          customVariables,
        }

        const processedSubject = processEmailTemplate(template.subject_template, context)
        const processedBody = processEmailTemplate(template.body_html, context)

        // Determine recipient email
        let recipientEmail = ''
        if (rule.send_to_customer && job.customer?.email) {
          recipientEmail = job.customer.email
        }

        if (!recipientEmail) {
          errors.push(`No recipient email for rule ${rule.id}`)
          continue
        }

        // Send email
        const sendResponse = await fetch(`${request.nextUrl.origin}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            to: recipientEmail,
            subject: processedSubject,
            html: processedBody,
            templateId: template.id,
            jobId: job.id,
            customerId: job.customer_id,
          }),
        })

        if (!sendResponse.ok) {
          const errorData = await sendResponse.json()
          const errorMsg = `Failed to send email for rule ${rule.id}: ${errorData.error}`
          errors.push(errorMsg)

          // Log failed execution
          await supabase.from('email_automation_logs').insert({
            rule_id: rule.id,
            job_id: job.id,
            customer_id: job.customer_id,
            template_id: template.id,
            status: 'failed',
            error_message: errorMsg,
            sent_to: [recipientEmail],
            variables_used: context,
          })

          continue
        }

        emailsSent.push({
          ruleId: rule.id,
          templateId: template.id,
          to: recipientEmail,
          subject: processedSubject,
        })

        // Log automation execution
        await supabase.from('email_automation_logs').insert({
          rule_id: rule.id,
          job_id: job.id,
          customer_id: job.customer_id,
          template_id: template.id,
          status: 'success',
          sent_to: [recipientEmail],
          variables_used: context,
          sent_at: new Date().toISOString(),
        })
      } catch (error: any) {
        const errorMsg = `Error processing rule ${rule.id}: ${error.message}`
        errors.push(errorMsg)

        // Log error
        await supabase.from('email_automation_logs').insert({
          rule_id: rule.id,
          job_id: jobId,
          customer_id: customerId,
          status: 'failed',
          error_message: errorMsg,
        })
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: emailsSent.length,
      details: emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Trigger automation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger automation' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGmailEmail, refreshGmailToken } from '@/lib/integrations/gmail'

function sanitizeFilename(filename: string, maxLength: number = 100): string {
  // Split filename and extension
  const lastDotIndex = filename.lastIndexOf('.')
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : ''

  // Sanitize name - only keep alphanumeric and underscores
  // Replace all special chars, spaces, hyphens, periods with underscores
  let sanitized = name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores

  // If empty after sanitization, use a default
  if (!sanitized) {
    sanitized = 'file'
  }

  // Truncate if too long (leaving room for extension and timestamp)
  const maxNameLength = maxLength - ext.length - 15 // 15 chars for timestamp
  if (sanitized.length > maxNameLength) {
    sanitized = sanitized.substring(0, maxNameLength)
  }

  return sanitized + ext
}

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

    // Parse request body (could be FormData or JSON)
    const contentType = request.headers.get('content-type') || ''
    let integrationId: string
    let to: string
    let cc: string | null
    let bcc: string | null
    let subject = ''
    let emailBody: string
    let bodyType: 'text' | 'html' = 'text'
    let customerId: string | null
    let files: File[] = []
    let fileRenames: { [index: number]: string } = {}

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with files)
      const formData = await request.formData()
      integrationId = formData.get('integrationId') as string
      to = formData.get('to') as string
      cc = formData.get('cc') as string | null
      bcc = formData.get('bcc') as string | null
      subject = (formData.get('subject') as string) || ''
      emailBody = formData.get('body') as string
      const bodyTypeValue = formData.get('bodyType') as string
      bodyType = (bodyTypeValue === 'html' ? 'html' : 'text')
      customerId = formData.get('customerId') as string | null

      // Get all files
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter((f): f is File => f instanceof File)

      // Get file renames if provided
      const fileRenamesStr = formData.get('fileRenames') as string | null
      if (fileRenamesStr) {
        fileRenames = JSON.parse(fileRenamesStr)
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json()
      integrationId = body.integrationId
      to = body.to
      cc = body.cc
      bcc = body.bcc
      subject = body.subject || ''
      emailBody = body.body
      bodyType = (body.bodyType === 'html' ? 'html' : 'text')
      customerId = body.customerId
    }

    if (!integrationId || !to || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: integrationId, to, body' },
        { status: 400 }
      )
    }

    // Get integration from database
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Gmail integration not found' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      // Token expired, refresh it
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

    // Process attachments if any
    const attachments: Array<{
      filename: string
      content: string
      mimeType: string
    }> = []
    const uploadedFiles: Array<{
      file_name: string
      file_type: string
      file_size: number
      storage_path: string
    }> = []

    if (files.length > 0) {
      console.log(`[Gmail Send] Processing ${files.length} attachments`)

      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        try {
          // Convert file to buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Use renamed filename if provided, otherwise use original
          const filename = fileRenames[index] || file.name

          // Generate unique filename with proper sanitization
          const timestamp = Date.now()
          const sanitizedFilename = sanitizeFilename(filename)
          const storagePath = `${user.id}/${timestamp}-${sanitizedFilename}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('customer-files')
            .upload(storagePath, buffer, {
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            })

          if (uploadError) {
            console.error('[Gmail Send] Storage upload error:', uploadError)
            throw new Error(`Failed to upload file: ${file.name}`)
          }

          console.log(`[Gmail Send] Uploaded file to storage: ${storagePath}`)

          // Convert to base64 for Gmail
          const base64Content = buffer.toString('base64')

          attachments.push({
            filename: sanitizedFilename,
            content: base64Content,
            mimeType: file.type || 'application/octet-stream',
          })

          uploadedFiles.push({
            file_name: sanitizedFilename,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            storage_path: storagePath,
          })
        } catch (error) {
          console.error(`[Gmail Send] Error processing file ${file.name}:`, error)
          throw error
        }
      }
    }

    // Send email via Gmail API
    await sendGmailEmail(accessToken, {
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject,
      body: emailBody,
      bodyType,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    console.log(`[Gmail Send] Email sent successfully with ${attachments.length} attachments`)

    // Store sent email in email_threads table
    const toEmails = Array.isArray(to) ? to : [to]
    const ccEmails = cc ? (Array.isArray(cc) ? cc : [cc]) : []
    const bccEmails = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []

    // Try to link to customer by email
    let linkedCustomerId = null
    if (toEmails.length === 1) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', toEmails[0])
        .single()

      console.log('[Gmail Send] Looking up customer for email:', toEmails[0])
      console.log('[Gmail Send] Customer found:', customer, 'Error:', customerError)

      if (customer) {
        linkedCustomerId = customer.id
      }
    }

    const { data: emailThread, error: insertError } = await supabase
      .from('email_threads')
      .insert({
        integration_id: integration.id,
        user_id: user.id,
        customer_id: linkedCustomerId,
        provider: 'gmail',
        provider_message_id: `sent-${Date.now()}`, // Placeholder until we can get real message ID
        from_email: integration.email_address,
        from_name: integration.display_name,
        to_emails: toEmails,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
        subject,
        body_text: bodyType === 'text' ? emailBody : null,
        body_html: bodyType === 'html' ? emailBody : null,
        is_read: true,
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Gmail Send] Error inserting email thread:', insertError)
      throw new Error('Failed to save email thread')
    }

    // Save attachment records if any
    if (uploadedFiles.length > 0 && emailThread) {
      const attachmentRecords = uploadedFiles.map((file) => ({
        email_thread_id: emailThread.id,
        file_name: file.file_name,
        file_type: file.file_type,
        file_size: file.file_size,
        storage_path: file.storage_path,
      }))

      const { error: attachmentError } = await supabase
        .from('email_attachments')
        .insert(attachmentRecords)

      if (attachmentError) {
        console.error('[Gmail Send] Error saving attachments:', attachmentError)
        // Don't fail the entire request, just log the error
      } else {
        console.log(`[Gmail Send] Saved ${attachmentRecords.length} attachment records`)
      }
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: any) {
    console.error('Error sending Gmail email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

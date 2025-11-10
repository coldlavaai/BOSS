import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const customerId = formData.get('customerId') as string
    const category = formData.get('category') as string || 'document'
    const description = formData.get('description') as string | null

    if (!file || !customerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify customer belongs to user
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename with proper sanitization
    const timestamp = Date.now()
    const sanitizedFilename = sanitizeFilename(file.name)
    const storagePath = `${user.id}/${customerId}/${timestamp}-${sanitizedFilename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('customer-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Customer File Upload] Storage error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Save file record to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('customer_files')
      .insert({
        customer_id: customerId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: storagePath,
        category,
        description,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Customer File Upload] Database error:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('customer-files').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (error: any) {
    console.error('[Customer File Upload] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}

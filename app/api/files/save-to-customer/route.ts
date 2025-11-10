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

    const body = await request.json()
    const { attachmentId, customerId } = body

    if (!attachmentId || !customerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get attachment from email_attachments
    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select('*, email_threads!inner(user_id)')
      .eq('id', attachmentId)
      .single()

    if (attachmentError || !attachment || attachment.email_threads.user_id !== user.id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Verify customer exists (customers table has no user_id, relies on RLS)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('customer-files')
      .download(attachment.storage_path)

    if (downloadError) {
      console.error('[Save to Customer] Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 })
    }

    // Create new storage path for customer file
    const timestamp = Date.now()
    const newStoragePath = `${user.id}/${customerId}/${timestamp}-${attachment.file_name}`

    // Upload to new location
    const buffer = await fileData.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('customer-files')
      .upload(newStoragePath, buffer, {
        contentType: attachment.file_type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Save to Customer] Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create customer_files record
    const { data: customerFile, error: dbError } = await supabase
      .from('customer_files')
      .insert({
        customer_id: customerId,
        user_id: user.id,
        file_name: attachment.file_name,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        storage_path: newStoragePath,
        category: 'received',
        description: 'Saved from email attachment',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Save to Customer] Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('customer-files').remove([newStoragePath])
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: customerFile })
  } catch (error: any) {
    console.error('[Save to Customer] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save attachment' },
      { status: 500 }
    )
  }
}

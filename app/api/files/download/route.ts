import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get file path from query parameter
    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    // Verify file belongs to user (path should start with user.id)
    if (!filePath.startsWith(user.id)) {
      return NextResponse.json({ error: 'Unauthorized access to file' }, { status: 403 })
    }

    // Download file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('customer-files')
      .download(filePath)

    if (error) {
      console.error('[File Download] Storage error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get filename from path
    const filename = filePath.split('/').pop() || 'download'

    // Return file with proper headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[File Download] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    )
  }
}

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const customerId = searchParams.get('customerId')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('email_threads')
      .select(`
        *,
        customer:customers(*),
        email_attachments(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)

    // Filter by customer if provided
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    // Apply pagination
    const { data: emails, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Emails API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      emails: emails || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error: any) {
    console.error('[Emails API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

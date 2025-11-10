import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all signatures for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all signatures
    const { data: signatures, error } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching signatures:', error)
      return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
    }

    return NextResponse.json({ signatures })
  } catch (error: any) {
    console.error('Error in GET /api/signatures:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new signature
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, html_content, text_content, is_default, source = 'manual', integration_id } = body

    if (!name || !html_content) {
      return NextResponse.json(
        { error: 'Name and HTML content are required' },
        { status: 400 }
      )
    }

    // Create signature
    const { data: signature, error } = await supabase
      .from('email_signatures')
      .insert({
        user_id: user.id,
        name,
        html_content,
        text_content,
        is_default: is_default || false,
        source,
        integration_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating signature:', error)
      return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
    }

    return NextResponse.json({ signature })
  } catch (error: any) {
    console.error('Error in POST /api/signatures:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

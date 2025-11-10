import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH - Update a signature
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, html_content, text_content, is_default } = body

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (html_content !== undefined) updates.html_content = html_content
    if (text_content !== undefined) updates.text_content = text_content
    if (is_default !== undefined) updates.is_default = is_default

    // Update signature
    const { data: signature, error } = await supabase
      .from('email_signatures')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating signature:', error)
      return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 })
    }

    if (!signature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }

    return NextResponse.json({ signature })
  } catch (error: any) {
    console.error('Error in PATCH /api/signatures/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a signature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Delete signature
    const { error } = await supabase
      .from('email_signatures')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting signature:', error)
      return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/signatures/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

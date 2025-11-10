import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { replyToGmbReview, refreshGmbToken } from '@/lib/integrations/gmb'

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

    // Parse request body
    const body = await request.json()
    const { reviewId, replyText } = body

    if (!reviewId || !replyText) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewId, replyText' },
        { status: 400 }
      )
    }

    // Get review from database
    const { data: review, error: reviewError } = await supabase
      .from('gmb_reviews')
      .select('*, integration:gmb_integrations(*)')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const integration = review.integration

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      // Token expired, refresh it
      console.log('GMB token expired, refreshing...')
      const tokens = await refreshGmbToken(integration.refresh_token)

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('gmb_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
        })
        .eq('id', integration.id)

      if (updateError) {
        console.error('Failed to update GMB tokens:', updateError)
        throw new Error('Failed to refresh access token')
      }

      accessToken = tokens.access_token
    }

    // Reply to review via GMB API
    await replyToGmbReview(
      accessToken,
      integration.account_id,
      integration.location_id,
      review.review_id,
      replyText
    )

    // Update review in database
    const { error: updateError } = await supabase
      .from('gmb_reviews')
      .update({
        review_reply: replyText,
        review_reply_at: new Date().toISOString(),
      })
      .eq('id', review.id)

    if (updateError) {
      console.error('Failed to update review in database:', updateError)
      // Don't throw error, reply was successful on GMB
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error replying to review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reply to review' },
      { status: 500 }
    )
  }
}

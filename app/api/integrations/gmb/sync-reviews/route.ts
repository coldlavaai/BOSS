import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGmbReviews,
  refreshGmbToken,
  starRatingToNumber,
} from '@/lib/integrations/gmb'

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
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json({ error: 'Missing integrationId' }, { status: 400 })
    }

    // Get integration from database
    const { data: integration, error: integrationError } = await supabase
      .from('gmb_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'GMB integration not found' },
        { status: 404 }
      )
    }

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

    // Fetch reviews from GMB
    const { reviews } = await fetchGmbReviews(
      accessToken,
      integration.account_id,
      integration.location_id,
      {
        pageSize: 100, // Fetch up to 100 reviews
      }
    )

    console.log(`Fetched ${reviews.length} reviews from GMB`)

    let syncedCount = 0
    let errors = 0

    // Process each review
    for (const review of reviews) {
      try {
        // Try to match review to customer by name (fuzzy match)
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .ilike('name', `%${review.reviewer.displayName}%`)
          .single()

        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('gmb_reviews')
          .select('id')
          .eq('review_id', review.reviewId)
          .single()

        if (!existingReview) {
          // Insert new review
          const { error: insertError } = await supabase.from('gmb_reviews').insert({
            user_id: user.id,
            integration_id: integration.id,
            review_id: review.reviewId,
            reviewer_name: review.reviewer.displayName,
            reviewer_profile_url: review.reviewer.profilePhotoUrl || null,
            star_rating: starRatingToNumber(review.starRating),
            comment: review.comment || null,
            review_reply: review.reviewReply?.comment || null,
            review_reply_at: review.reviewReply?.updateTime
              ? new Date(review.reviewReply.updateTime).toISOString()
              : null,
            review_date: new Date(review.createTime).toISOString(),
            is_edited: review.updateTime !== review.createTime,
            customer_id: customer?.id || null,
          })

          if (insertError) {
            console.error('Error inserting review:', insertError)
            errors++
          } else {
            syncedCount++
          }
        } else {
          // Update existing review
          const { error: updateError } = await supabase
            .from('gmb_reviews')
            .update({
              reviewer_name: review.reviewer.displayName,
              reviewer_profile_url: review.reviewer.profilePhotoUrl || null,
              star_rating: starRatingToNumber(review.starRating),
              comment: review.comment || null,
              review_reply: review.reviewReply?.comment || null,
              review_reply_at: review.reviewReply?.updateTime
                ? new Date(review.reviewReply.updateTime).toISOString()
                : null,
              is_edited: review.updateTime !== review.createTime,
              customer_id: customer?.id || null,
            })
            .eq('id', existingReview.id)

          if (updateError) {
            console.error('Error updating review:', updateError)
            errors++
          } else {
            syncedCount++
          }
        }
      } catch (error) {
        console.error('Error processing review:', error)
        errors++
      }
    }

    // Update last sync time
    await supabase
      .from('gmb_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: reviews.length,
      errors,
    })
  } catch (error: any) {
    console.error('Error syncing GMB reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync reviews' },
      { status: 500 }
    )
  }
}

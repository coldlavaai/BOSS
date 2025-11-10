'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Star, MessageSquare, User, Calendar, Loader2, Send } from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'
import Link from 'next/link'

type GmbIntegration = Database['public']['Tables']['gmb_integrations']['Row']
type GmbReview = Database['public']['Tables']['gmb_reviews']['Row'] & {
  customer?: Database['public']['Tables']['customers']['Row']
  job?: Database['public']['Tables']['jobs']['Row'] & {
    service?: Database['public']['Tables']['services']['Row']
  }
}

interface ReviewsPageProps {
  gmbIntegration: GmbIntegration | null
  reviews: GmbReview[]
}

export function ReviewsPage({ gmbIntegration, reviews }: ReviewsPageProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedReview, setSelectedReview] = useState<GmbReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.star_rating, 0) / reviews.length).toFixed(1)
      : '0.0'

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (selectedRating && review.star_rating !== selectedRating) {
      return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesComment = review.comment?.toLowerCase().includes(query)
      const matchesName = review.reviewer_name?.toLowerCase().includes(query)
      return matchesComment || matchesName
    }

    return true
  })

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      return
    }

    setReplying(true)
    try {
      const response = await fetch('/api/integrations/gmb/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          replyText: replyText.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reply')
      }

      alert('Reply sent successfully!')
      setSelectedReview(null)
      setReplyText('')

      // Refresh data from server (instant, no full reload)
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to send reply')
    } finally {
      setReplying(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (!gmbIntegration) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Google My Business Not Connected</CardTitle>
            <CardDescription>
              Connect your Google My Business account to manage reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings?tab=integrations">
              <Button className="w-full" style={{ backgroundColor: '#d52329' }}>
                Go to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Reviews</h1>
        <p className="text-xs lg:text-base text-gray-500 mt-1">
          Manage your Google My Business reviews
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 lg:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">{averageRating}</div>
              <div className="flex justify-center mt-1 lg:mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
              <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Average Rating</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">{reviews.length}</div>
              <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Total Reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">
                {reviews.filter((r) => r.star_rating === 5).length}
              </div>
              {renderStars(5)}
              <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">5-Star Reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 lg:pt-6">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">
                {reviews.filter((r) => !r.review_reply).length}
              </div>
              <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Pending Replies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 lg:pt-6">
          <div className="flex gap-3 lg:gap-4 flex-col lg:flex-row">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedRating === null ? 'default' : 'outline'}
                onClick={() => setSelectedRating(null)}
                size="sm"
                className="text-xs lg:text-sm"
              >
                All
              </Button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <Button
                  key={rating}
                  variant={selectedRating === rating ? 'default' : 'outline'}
                  onClick={() => setSelectedRating(rating)}
                  size="sm"
                  className="text-xs lg:text-sm"
                >
                  {rating} <Star className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-3 lg:space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-6 lg:p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reviews found</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4 lg:pt-6">
                <div className="flex gap-3 lg:gap-4">
                  {/* Reviewer Info - Hidden on mobile */}
                  <div className="flex-shrink-0 hidden sm:block">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 lg:h-6 lg:w-6 text-gray-500" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm lg:text-base">{review.reviewer_name || 'Anonymous'}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {renderStars(review.star_rating)}
                          <span className="text-xs lg:text-sm text-gray-500">
                            {format(new Date(review.review_date), 'PP')}
                          </span>
                        </div>
                      </div>

                      {!review.review_reply && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReview(review)
                            setReplyText('')
                          }}
                          className="flex-shrink-0"
                        >
                          <MessageSquare className="h-4 w-4 lg:mr-2" />
                          <span className="hidden lg:inline">Reply</span>
                        </Button>
                      )}
                    </div>

                    {/* Review Comment */}
                    {review.comment && (
                      <div className="mt-2 lg:mt-3 text-sm lg:text-base text-gray-700">{review.comment}</div>
                    )}

                    {/* CRM Linkage */}
                    {(review.customer || review.job) && (
                      <div className="flex gap-2 mt-3">
                        {review.customer && (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            {review.customer.name}
                          </Badge>
                        )}
                        {review.job?.service && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {review.job.service.name}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Our Reply */}
                    {review.review_reply && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge style={{ backgroundColor: '#d52329' }} className="text-white">
                            Your Reply
                          </Badge>
                          {review.review_reply_at && (
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.review_reply_at), 'PPP')}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-700">{review.review_reply}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog
        open={selectedReview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReview(null)
            setReplyText('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Respond to {selectedReview?.reviewer_name || 'this customer'}'s review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* Review Preview */}
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.star_rating)}
                  <span className="text-sm font-medium">{selectedReview.reviewer_name}</span>
                </div>
                {selectedReview.comment && (
                  <p className="text-sm text-gray-700">{selectedReview.comment}</p>
                )}
              </div>

              {/* Reply Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={6}
                  disabled={replying}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReview(null)
                setReplyText('')
              }}
              disabled={replying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReply}
              disabled={replying || !replyText.trim()}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              {replying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

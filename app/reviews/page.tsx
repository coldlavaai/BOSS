import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsPage } from '@/components/reviews/ReviewsPage'

export default async function Reviews() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch GMB integration
  const { data: gmbIntegration } = await supabase
    .from('gmb_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  // Fetch all reviews
  const { data: reviews } = await supabase
    .from('gmb_reviews')
    .select(`
      *,
      customer:customers(id, name, email, phone),
      job:jobs(id, booking_datetime, service:services(name))
    `)
    .eq('user_id', user.id)
    .order('review_date', { ascending: false })

  return (
    <ReviewsPage
      gmbIntegration={gmbIntegration}
      reviews={reviews || []}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KanbanBoard } from '@/components/board/KanbanBoard'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

export default async function BoardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch pipeline stages
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('display_order', { ascending: true })

  // Fetch jobs with relations including add-ons
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      car:cars(*),
      service:services(*),
      pipeline_stage:pipeline_stages(*),
      job_add_ons(
        add_on:add_ons(*)
      )
    `)
    .order('booking_datetime', { ascending: true })

  return (
    <div className="h-full">
      <KanbanBoard
        initialStages={stages || []}
        initialJobs={jobs || []}
      />
    </div>
  )
}

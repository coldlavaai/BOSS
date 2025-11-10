import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectsList } from '@/components/projects/ProjectsList'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all projects with client info
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(id, name, company)
    `)
    .order('created_at', { ascending: false })

  // Fetch all active clients for the project form
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company')
    .in('pipeline_stage', ['active', 'won'])
    .order('name')

  if (error) {
    console.error('Error fetching projects:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
        <p className="text-slate-600 mt-1">Track project profitability and hours</p>
      </div>

      <ProjectsList initialProjects={projects || []} clients={clients || []} />
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectForm } from './ProjectForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string; company?: string }
interface Project {
  id: string; name: string; description?: string; status: string;
  hourly_rate_gbp?: number; budget_hours?: number; client: Client; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-800', active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800', completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function ProjectsList({ initialProjects, clients }: { initialProjects: Project[]; clients: Client[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete project?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(projects.filter(p => p.id !== id))
  }

  return (<>
    <div className="flex justify-end mb-4">
      <Button onClick={() => { setEditingProject(null); setIsFormOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" /> Add Project
      </Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Card key={p.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-slate-600">{p.client.name}{p.client.company && ` - ${p.client.company}`}</p>
            </div>
            <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
          </div>
          {p.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{p.description}</p>}
          <div className="flex gap-4 text-sm text-slate-600 mb-3">
            {p.hourly_rate_gbp && <span className="font-semibold text-green-700">£{(p.hourly_rate_gbp / 100).toFixed(2)}/hr</span>}
            {p.budget_hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.budget_hours}h</span>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingProject(p); setIsFormOpen(true) }} className="flex-1">
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
    {projects.length === 0 && (
      <Card className="p-12 text-center">
        <p className="text-slate-500 mb-4">No projects yet</p>
        <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600"><Plus className="h-4 w-4 mr-2" /> Add Project</Button>
      </Card>
    )}
    <ProjectForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingProject(null); router.refresh() }} project={editingProject} clients={clients} />
  </>)
}

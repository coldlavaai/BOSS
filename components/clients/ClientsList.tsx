'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientForm } from './ClientForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string; company?: string; email?: string; phone?: string; pipeline_stage: string; pipeline_value_gbp?: number; notes?: string; created_at: string }

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-800', qualified: 'bg-blue-100 text-blue-800', proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800', won: 'bg-green-100 text-green-800', lost: 'bg-red-100 text-red-800',
  active: 'bg-emerald-100 text-emerald-800', inactive: 'bg-slate-100 text-slate-800',
}

export function ClientsList({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete client?')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) setClients(clients.filter(c => c.id !== id))
  }

  return (<>
    <div className="flex justify-end mb-4">
      <Button onClick={() => { setEditingClient(null); setIsFormOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" /> Add Client
      </Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((c) => (
        <Card key={c.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1"><h3 className="font-semibold text-lg">{c.name}</h3>{c.company && <p className="text-sm text-slate-600">{c.company}</p>}</div>
            <Badge className={STAGE_COLORS[c.pipeline_stage]}>{c.pipeline_stage}</Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-600 mb-3">
            {c.email && <p>{c.email}</p>}{c.phone && <p>{c.phone}</p>}
            {c.pipeline_value_gbp && <p className="font-semibold text-green-700">£{(c.pipeline_value_gbp / 100).toFixed(2)}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingClient(c); setIsFormOpen(true) }} className="flex-1"><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
            <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)} className="text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </Card>
      ))}
    </div>
    {clients.length === 0 && <Card className="p-12 text-center"><p className="text-slate-500 mb-4">No clients yet</p><Button onClick={() => setIsFormOpen(true)} className="bg-blue-600"><Plus className="h-4 w-4 mr-2" /> Add Client</Button></Card>}
    <ClientForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingClient(null); router.refresh() }} client={editingClient} />
  </>)
}

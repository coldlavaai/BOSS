'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface Client { id: string; name: string; company?: string }
interface Project {
  id: string; name: string; description?: string; status: string; client_id: string;
  hourly_rate_gbp?: number; budget_hours?: number
}

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled']

export function ProjectForm({ isOpen, onClose, project, clients }: {
  isOpen: boolean; onClose: () => void; project: (Project & { client: Client }) | null; clients: Client[]
}) {
  const [formData, setFormData] = useState({
    name: '', client_id: '', description: '', status: 'planning', hourly_rate_gbp: '', budget_hours: ''
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '', client_id: project.client_id || '', description: project.description || '',
        status: project.status || 'planning',
        hourly_rate_gbp: project.hourly_rate_gbp ? (project.hourly_rate_gbp / 100).toString() : '',
        budget_hours: project.budget_hours ? project.budget_hours.toString() : ''
      })
    } else {
      setFormData({ name: '', client_id: '', description: '', status: 'planning', hourly_rate_gbp: '50.00', budget_hours: '' })
    }
  }, [project, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const data = {
      ...formData,
      hourly_rate_gbp: formData.hourly_rate_gbp ? Math.round(parseFloat(formData.hourly_rate_gbp) * 100) : null,
      budget_hours: formData.budget_hours ? parseFloat(formData.budget_hours) : null
    }
    const { error } = project
      ? await supabase.from('projects').update(data).eq('id', project.id)
      : await supabase.from('projects').insert([data])
    setLoading(false)
    if (!error) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{project ? 'Edit' : 'Add'} Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Project Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="md:col-span-2">
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({...formData, client_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.company && ` - ${c.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hourly Rate (£)</Label>
              <Input type="number" step="0.01" value={formData.hourly_rate_gbp} onChange={(e) => setFormData({...formData, hourly_rate_gbp: e.target.value})} placeholder="50.00" />
            </div>
            <div>
              <Label>Budget (hours)</Label>
              <Input type="number" step="0.5" value={formData.budget_hours} onChange={(e) => setFormData({...formData, budget_hours: e.target.value})} placeholder="40" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600">{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

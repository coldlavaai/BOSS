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
interface Project { id: string; name: string; client: Client }
interface TimeEntry {
  id: string; date: string; hours: number; description?: string; project_id: string; billable: boolean
}

export function TimeEntryForm({ isOpen, onClose, entry, projects }: {
  isOpen: boolean; onClose: () => void;
  entry: (TimeEntry & { project: Project }) | null;
  projects: (Project & { client: Client })[]
}) {
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    date: today, project_id: '', hours: '', description: '', billable: true
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || today,
        project_id: entry.project_id || '',
        hours: entry.hours ? entry.hours.toString() : '',
        description: entry.description || '',
        billable: entry.billable !== false
      })
    } else {
      setFormData({ date: today, project_id: '', hours: '', description: '', billable: true })
    }
  }, [entry, isOpen, today])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const data = {
      ...formData,
      hours: parseFloat(formData.hours)
    }
    const { error } = entry
      ? await supabase.from('time_entries').update(data).eq('id', entry.id)
      : await supabase.from('time_entries').insert([data])
    setLoading(false)
    if (!error) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{entry ? 'Edit' : 'Add'} Time Entry</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div>
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.hours}
                onChange={(e) => setFormData({...formData, hours: e.target.value})}
                placeholder="8.0"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Project *</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({...formData, project_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                placeholder="What did you work on?"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.billable}
                  onChange={(e) => setFormData({...formData, billable: e.target.checked})}
                />
                <span className="text-sm">Billable</span>
              </label>
            </div>
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

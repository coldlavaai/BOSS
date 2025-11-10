'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface Client { id: string; name: string; company?: string; email?: string; phone?: string; pipeline_stage: string; pipeline_value_gbp?: number; notes?: string }

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'active', 'inactive']

export function ClientForm({ isOpen, onClose, client }: { isOpen: boolean; onClose: () => void; client: Client | null }) {
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', pipeline_stage: 'lead', pipeline_value_gbp: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '', company: client.company || '', email: client.email || '', phone: client.phone || '',
        pipeline_stage: client.pipeline_stage || 'lead', pipeline_value_gbp: client.pipeline_value_gbp ? (client.pipeline_value_gbp / 100).toString() : '', notes: client.notes || ''
      })
    } else {
      setFormData({ name: '', company: '', email: '', phone: '', pipeline_stage: 'lead', pipeline_value_gbp: '', notes: '' })
    }
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const data = { ...formData, pipeline_value_gbp: formData.pipeline_value_gbp ? Math.round(parseFloat(formData.pipeline_value_gbp) * 100) : null }
    const { error } = client ? await supabase.from('clients').update(data).eq('id', client.id) : await supabase.from('clients').insert([data])
    setLoading(false)
    if (!error) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{client ? 'Edit' : 'Add'} Client</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
            <div><Label>Company</Label><Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
            <div><Label>Pipeline Stage</Label><Select value={formData.pipeline_stage} onValueChange={(v) => setFormData({...formData, pipeline_stage: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Value (£)</Label><Input type="number" step="0.01" value={formData.pipeline_value_gbp} onChange={(e) => setFormData({...formData, pipeline_value_gbp: e.target.value})} placeholder="0.00" /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} /></div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600">{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

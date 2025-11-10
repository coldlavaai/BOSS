'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TimeEntryForm } from './TimeEntryForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string; company?: string }
interface Project { id: string; name: string; hourly_rate_gbp?: number; client: Client }
interface TimeEntry {
  id: string; date: string; hours: number; description?: string; billable: boolean;
  project: Project; created_at: string
}

export function TimeEntriesList({ initialEntries, projects }: {
  initialEntries: TimeEntry[]; projects: (Project & { client: Client })[]
}) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete time entry?')) return
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (!error) setEntries(entries.filter(e => e.id !== id))
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB')

  return (<>
    <div className="flex justify-end mb-4">
      <Button onClick={() => { setEditingEntry(null); setIsFormOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" /> Add Time Entry
      </Button>
    </div>

    <Card className="overflow-hidden">
      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left p-3 text-sm font-semibold text-slate-700">Project</th>
                <th className="text-left p-3 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Hours</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Rate</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Revenue</th>
                <th className="text-left p-3 text-sm font-semibold text-slate-700">Description</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const rate = entry.project?.hourly_rate_gbp || 0
                const revenue = entry.hours * rate
                return (
                  <tr key={entry.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(entry.date)}
                      </div>
                    </td>
                    <td className="p-3 text-sm font-medium">{entry.project?.name}</td>
                    <td className="p-3 text-sm text-slate-600">{entry.project?.client?.name}</td>
                    <td className="p-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {entry.hours}h
                      </div>
                    </td>
                    <td className="p-3 text-sm text-right">£{(rate / 100).toFixed(2)}</td>
                    <td className="p-3 text-sm text-right font-semibold text-green-700">
                      £{(revenue / 100).toFixed(2)}
                    </td>
                    <td className="p-3 text-sm text-slate-600 max-w-xs truncate">{entry.description || '-'}</td>
                    <td className="p-3 text-sm">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingEntry(entry); setIsFormOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center">
          <p className="text-slate-500 mb-4">No time entries yet</p>
          <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600">
            <Plus className="h-4 w-4 mr-2" /> Add Time Entry
          </Button>
        </div>
      )}
    </Card>

    <TimeEntryForm
      isOpen={isFormOpen}
      onClose={() => { setIsFormOpen(false); setEditingEntry(null); router.refresh() }}
      entry={editingEntry}
      projects={projects}
    />
  </>)
}

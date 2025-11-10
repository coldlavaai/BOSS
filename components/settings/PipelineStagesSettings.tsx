'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, GripVertical, Trash2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

interface PipelineStagesSettingsProps {
  initialStages: PipelineStage[]
}

function SortableStageItem({ stage, onDelete, saving }: {
  stage: PipelineStage
  onDelete: (id: string) => void
  saving: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-white"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1">
        <div className="font-medium">{stage.name}</div>
        {stage.is_default && (
          <div className="text-xs text-gray-500">Default for new jobs</div>
        )}
        {stage.is_archived && (
          <div className="text-xs text-gray-500">Archive stage</div>
        )}
      </div>
      {!stage.is_archived && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(stage.id)}
          disabled={saving}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      )}
    </div>
  )
}

export function PipelineStagesSettings({ initialStages }: PipelineStagesSettingsProps) {
  const [stages, setStages] = useState(initialStages)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6B7280')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      setError('Stage name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('pipeline_stages')
        .insert([
          {
            name: newStageName,
            color: newStageColor,
            display_order: stages.length,
            is_archived: false,
            is_default: false,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        setStages([...stages, data])
        setNewStageName('')
        setNewStageColor('#6B7280')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Are you sure? Jobs in this stage will be moved to the first stage.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)

      if (deleteError) throw deleteError

      setStages(stages.filter((s) => s.id !== stageId))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)

    const newStages = arrayMove(stages, oldIndex, newIndex)
    setStages(newStages)

    // Update display_order in database
    setSaving(true)
    try {
      const updates = newStages.map((stage, index) => ({
        id: stage.id,
        display_order: index,
      }))

      for (const update of updates) {
        await supabase
          .from('pipeline_stages')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to reorder stages')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Manage the stages in your job pipeline. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Stages */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    onDelete={handleDeleteStage}
                    saving={saving}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add New Stage */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-3">Add New Stage</div>
            <div className="grid grid-cols-[1fr,auto,auto] gap-3">
              <div>
                <Label htmlFor="stage-name">Stage Name</Label>
                <Input
                  id="stage-name"
                  placeholder="e.g. Awaiting Parts"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="stage-color">Color</Label>
                <Input
                  id="stage-color"
                  type="color"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  disabled={saving}
                  className="w-20 h-10"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddStage}
                  disabled={saving || !newStageName.trim()}
                  style={{ backgroundColor: '#d52329' }}
                  className="text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

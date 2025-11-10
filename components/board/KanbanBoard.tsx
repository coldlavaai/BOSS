'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core'
import { Database } from '@/types/database'
import { KanbanColumn } from './KanbanColumn'
import { JobCard } from './JobCard'
import { MobileKanbanView } from './MobileKanbanView'
import { CreateJobDialog } from './CreateJobDialog'
import { EditJobDialog } from './EditJobDialog'
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Customer = Database['public']['Tables']['customers']['Row']

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface KanbanBoardProps {
  initialStages: PipelineStage[]
  initialJobs: Job[]
}

export function KanbanBoard({ initialStages, initialJobs }: KanbanBoardProps) {
  const [stages] = useState(initialStages)
  const [jobs, setJobs] = useState(initialJobs)
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [syncedJobIds, setSyncedJobIds] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const router = useRouter()

  // Load synced job IDs
  useEffect(() => {
    loadSyncedJobs()
  }, [])

  const loadSyncedJobs = async () => {
    try {
      const { data } = await supabase
        .from('synced_calendar_events')
        .select('job_id')

      if (data) {
        setSyncedJobIds(new Set(data.map(item => item.job_id)))
      }
    } catch (error) {
      console.error('Error loading synced jobs:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find((j) => j.id === event.active.id)
    setActiveJob(job || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)

    if (!over || active.id === over.id) return

    const jobId = active.id as string
    const newStageId = over.id as string

    // Optimistic update
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              pipeline_stage_id: newStageId,
              pipeline_stage: stages.find((s) => s.id === newStageId)!,
            }
          : job
      )
    )

    // Update in database
    const { error } = await supabase
      .from('jobs')
      .update({ pipeline_stage_id: newStageId })
      .eq('id', jobId)

    if (error) {
      console.error('Error updating job:', error)
      // Revert on error
      router.refresh()
    }
  }

  const getJobsForStage = (stageId: string) => {
    return jobs.filter((job) => job.pipeline_stage_id === stageId)
  }

  const handleJobDeleted = (jobId: string) => {
    // Remove job from state immediately
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId))
    setSyncedJobIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(jobId)
      return newSet
    })
  }

  const handleJobUpdated = async (jobId: string) => {
    // Fetch the updated job with all relations
    const { data: updatedJob } = await supabase
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
      .eq('id', jobId)
      .single()

    if (updatedJob) {
      // Update in jobs state immediately
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.id === jobId ? (updatedJob as Job) : job))
      )

      // Update synced status
      const { data: syncData } = await supabase
        .from('synced_calendar_events')
        .select('job_id')
        .eq('job_id', jobId)
        .single()

      setSyncedJobIds((prev) => {
        const newSet = new Set(prev)
        if (syncData) {
          newSet.add(jobId)
        } else {
          newSet.delete(jobId)
        }
        return newSet
      })
    }
  }

  const handleJobCreated = async (newJobId: string) => {
    // Fetch the newly created job with all relations
    const { data: newJob } = await supabase
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
      .eq('id', newJobId)
      .single()

    if (newJob) {
      // Add to jobs state immediately
      setJobs((prevJobs) => [...prevJobs, newJob as Job])

      // Check if it was synced to calendar
      const { data: syncData } = await supabase
        .from('synced_calendar_events')
        .select('job_id')
        .eq('job_id', newJobId)
        .single()

      if (syncData) {
        setSyncedJobIds((prev) => new Set([...prev, newJobId]))
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Header - hidden on mobile */}
      <div className="hidden lg:flex border-b bg-white px-6 py-4 items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: '#32373c' }}>
            Job Board
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Drag jobs between stages to update their status
          </p>
        </div>
        <Button
          onClick={() => setIsCreateJobOpen(true)}
          style={{ backgroundColor: '#d52329' }}
          className="text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Mobile View - Tab-based with bottom stage selector */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        <MobileKanbanView
          stages={stages}
          jobs={jobs}
          syncedJobIds={syncedJobIds}
          onJobClick={(job) => setEditingJob(job)}
          onCustomerClick={(customer) => setViewingCustomer(customer)}
          onJobDeleted={handleJobDeleted}
          onCreateJob={() => setIsCreateJobOpen(true)}
        />
      </div>

      {/* Desktop View - Drag and drop columns */}
      <div className="hidden lg:flex flex-1 overflow-x-auto bg-gray-50 p-6">
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                jobs={getJobsForStage(stage.id)}
                onJobClick={(job) => setEditingJob(job)}
                onCustomerClick={(job) => setViewingCustomer(job.customer)}
                onJobDeleted={handleJobDeleted}
                syncedJobIds={syncedJobIds}
              />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? <JobCard job={activeJob} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Job Dialog */}
      <CreateJobDialog
        open={isCreateJobOpen}
        onOpenChange={setIsCreateJobOpen}
        onJobCreated={(newJob) => {
          handleJobCreated(newJob.id)
          setIsCreateJobOpen(false)
        }}
      />

      {/* Edit Job Dialog */}
      <EditJobDialog
        job={editingJob}
        open={!!editingJob}
        onOpenChange={(open) => {
          if (!open) setEditingJob(null)
        }}
        onJobUpdated={() => {
          if (editingJob) {
            handleJobUpdated(editingJob.id)
          }
          setEditingJob(null)
        }}
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={viewingCustomer}
        open={!!viewingCustomer}
        onOpenChange={(open) => {
          if (!open) setViewingCustomer(null)
        }}
        onCustomerUpdated={(updatedCustomer) => {
          router.refresh()
          setViewingCustomer(updatedCustomer)
        }}
      />
    </div>
  )
}

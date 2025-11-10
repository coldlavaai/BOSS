'use client'

import { useDroppable } from '@dnd-kit/core'
import { Database } from '@/types/database'
import { JobCard } from './JobCard'
import { cn } from '@/lib/utils'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface KanbanColumnProps {
  stage: PipelineStage
  jobs: Job[]
  onJobClick?: (job: Job) => void
  onCustomerClick?: (job: Job) => void
  onJobDeleted?: (jobId: string) => void
  syncedJobIds?: Set<string>
}

export function KanbanColumn({ stage, jobs, onJobClick, onCustomerClick, onJobDeleted, syncedJobIds }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex flex-col w-full lg:w-72 lg:flex-shrink-0">
      {/* Column Header */}
      <div className="bg-white border border-gray-200 rounded-t-lg p-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-gray-900 text-sm">{stage.name}</h3>
          </div>
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
            {jobs.length}
          </span>
        </div>
        {stage.description && (
          <p className="text-[10px] text-gray-500 mt-0.5 pl-4">{stage.description}</p>
        )}
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 bg-gray-50/50 border border-t-0 border-gray-200 rounded-b-lg p-2.5 space-y-2 min-h-[200px] lg:overflow-y-auto',
          isOver && 'bg-blue-50/50 ring-2 ring-blue-400 ring-offset-2',
        )}
      >
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <div className="text-gray-300 mb-2">—</div>
            <div>No jobs in this stage</div>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={onJobClick ? () => onJobClick(job) : undefined}
              onCustomerClick={onCustomerClick ? () => onCustomerClick(job) : undefined}
              onDelete={() => onJobDeleted?.(job.id)}
              isSynced={syncedJobIds?.has(job.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

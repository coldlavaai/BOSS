'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { JobCard } from './JobCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type Customer = Database['public']['Tables']['customers']['Row']
type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface MobileKanbanViewProps {
  stages: PipelineStage[]
  jobs: Job[]
  syncedJobIds: Set<string>
  onJobClick: (job: Job) => void
  onCustomerClick: (customer: Customer) => void
  onJobDeleted: (jobId: string) => void
  onCreateJob: () => void
}

export function MobileKanbanView({
  stages,
  jobs,
  syncedJobIds,
  onJobClick,
  onCustomerClick,
  onJobDeleted,
  onCreateJob,
}: MobileKanbanViewProps) {
  const [activeStageId, setActiveStageId] = useState(stages[0]?.id || '')

  const activeStage = stages.find(s => s.id === activeStageId)
  const stageJobs = jobs.filter(j => j.pipeline_stage_id === activeStageId)

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable job cards area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Stage header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeStage?.color }}
              />
              <h2 className="text-lg font-bold text-gray-900">{activeStage?.name}</h2>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {stageJobs.length}
              </span>
            </div>
            <Button
              size="sm"
              onClick={onCreateJob}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {activeStage?.description && (
            <p className="text-xs text-gray-600 mt-2">{activeStage.description}</p>
          )}
        </div>

        {/* Job cards */}
        <div className="p-4 space-y-3">
          {stageJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl text-gray-400">—</div>
              </div>
              <p className="text-gray-500 font-medium">No jobs in this stage</p>
              <p className="text-sm text-gray-400 mt-1">Tap + to create a new job</p>
            </div>
          ) : (
            stageJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => onJobClick(job)}
                onCustomerClick={() => onCustomerClick(job.customer)}
                onDelete={() => onJobDeleted(job.id)}
                isSynced={syncedJobIds.has(job.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom stage tabs */}
      <div className="bg-white border-t border-gray-200 overflow-x-auto">
        <div className="flex p-2 gap-2 min-w-max">
          {stages.map((stage) => {
            const count = jobs.filter(j => j.pipeline_stage_id === stage.id).length
            const isActive = stage.id === activeStageId

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isActive && 'ring-2 ring-white/50'
                  )}
                  style={{ backgroundColor: stage.color }}
                />
                <span>{stage.name}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-gray-600'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

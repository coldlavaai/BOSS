'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Car, PoundSterling, CheckCircle2, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { EditJobDialog } from '@/components/board/EditJobDialog'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface CustomerCurrentJobsTabProps {
  jobs: Job[]
  onJobsUpdated: () => void
}

export function CustomerCurrentJobsTab({
  jobs,
  onJobsUpdated,
}: CustomerCurrentJobsTabProps) {
  const [editingJob, setEditingJob] = useState<Job | null>(null)

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy • h:mm a')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5" style={{ color: '#d52329' }} />
        Current Jobs ({jobs.length})
      </h3>

      {jobs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No active jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={job.deposit_paid ? 'border-l-4 border-l-green-500' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{job.service.name}</h4>
                      <div
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: job.pipeline_stage.color }}
                      >
                        {job.pipeline_stage.name}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(job.booking_datetime)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingJob(job)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Car className="h-4 w-4" />
                    <span>
                      {job.car.make} {job.car.model} ({job.car.year})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <PoundSterling className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold" style={{ color: '#d52329' }}>
                      {formatPrice(job.total_price)}
                    </span>
                    {job.deposit_paid && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">
                          Deposit: {formatPrice(job.deposit_amount || 0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {job.notes && (
                    <div className="pt-2 mt-2 border-t text-gray-600 italic text-xs">
                      {job.notes}
                    </div>
                  )}
                </div>

                {job.source !== 'manual' && (
                  <div className="mt-3 pt-3 border-t">
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          job.source === 'sophie' ? '#FEF3C7' : '#DBEAFE',
                        color: job.source === 'sophie' ? '#92400E' : '#1E40AF',
                      }}
                    >
                      {job.source === 'sophie' ? 'Sophie AI' : 'Widget'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditJobDialog
        job={editingJob}
        open={!!editingJob}
        onOpenChange={(open) => {
          if (!open) setEditingJob(null)
        }}
        onJobUpdated={() => {
          onJobsUpdated()
          setEditingJob(null)
        }}
      />
    </div>
  )
}

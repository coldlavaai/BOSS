'use client'

import { Database } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Car, PoundSterling, CheckCircle2, History } from 'lucide-react'
import { format } from 'date-fns'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface CustomerJobHistoryTabProps {
  jobs: Job[]
}

export function CustomerJobHistoryTab({ jobs }: CustomerJobHistoryTabProps) {
  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy')
  }

  // Calculate total spent
  const totalSpent = jobs.reduce((sum, job) => sum + job.total_price, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" style={{ color: '#d52329' }} />
          Service History ({jobs.length})
        </h3>
        {jobs.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Spent</div>
            <div className="text-xl font-bold" style={{ color: '#d52329' }}>
              {formatPrice(totalSpent)}
            </div>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No service history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="border-l-4 border-l-gray-400">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{job.service.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(job.booking_datetime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: '#d52329' }}>
                      {formatPrice(job.total_price)}
                    </div>
                    {job.deposit_paid && (
                      <div className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Paid</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Car className="h-4 w-4" />
                    <span>
                      {job.car.make} {job.car.model} ({job.car.year})
                    </span>
                  </div>

                  {job.notes && (
                    <div className="pt-2 mt-2 border-t text-gray-600 italic text-xs">
                      {job.notes}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div
                    className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
                  >
                    {job.pipeline_stage.name}
                  </div>
                  {job.source !== 'manual' && (
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
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

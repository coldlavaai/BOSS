'use client'

import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Calendar, User, Car, Wrench, ChevronRight } from 'lucide-react'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface JobListDialogProps {
  title: string
  jobs: Job[]
  onClose: () => void
}

export function JobListDialog({ title, jobs, onClose }: JobListDialogProps) {
  const router = useRouter()

  const handleJobClick = (job: Job) => {
    // Navigate to customers page with this customer's detail dialog open
    router.push(`/customers?customerId=${job.customer_id}`)
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs found for this period
            </div>
          ) : (
            jobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleJobClick(job)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Customer and Service */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-lg">{job.customer.name}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {/* Service */}
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{job.service.name}</span>
                        </div>

                        {/* Car */}
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {job.car.make} {job.car.model}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {format(new Date(job.booking_datetime), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">
                            £{(job.total_price / 100).toFixed(2)}
                            {job.deposit_paid && ' (Deposit paid)'}
                          </span>
                        </div>
                      </div>

                      {/* Pipeline Stage */}
                      <div>
                        <Badge
                          style={{
                            backgroundColor: job.pipeline_stage.color,
                            color: 'white',
                          }}
                        >
                          {job.pipeline_stage.name}
                        </Badge>
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

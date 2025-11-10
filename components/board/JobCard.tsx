'use client'

import { useDraggable } from '@dnd-kit/core'
import { Database } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Car, Phone, PoundSterling, CheckCircle2, CalendarCheck, User, Trash2, GripVertical, ArrowDownToLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useState } from 'react'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
  job_add_ons?: Array<{
    add_on: {
      id: string
      name: string
      description: string | null
      price_incl_vat: number
    }
  }>
}

interface JobCardProps {
  job: Job
  isDragging?: boolean
  onClick?: () => void
  onCustomerClick?: () => void
  onDelete?: () => void
  isSynced?: boolean
}

export function JobCard({ job, isDragging, onClick, onCustomerClick, onDelete, isSynced }: JobCardProps) {
  const [deleting, setDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({
    id: job.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a')
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if we're not dragging
    if (!isBeingDragged && onClick) {
      onClick()
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this job? This will also remove it from your synced Google Calendar if connected.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/calendar/delete-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, deleteFromCalendar: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete job')
      }

      if (onDelete) {
        onDelete()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete job')
    } finally {
      setDeleting(false)
    }
  }

  // Get stage color for theming
  const stageColor = job.pipeline_stage?.color || '#6b7280'

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: (isDragging || isBeingDragged) ? stageColor : '#e5e7eb',
      }}
      className={cn(
        'group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden w-full',
        (isDragging || isBeingDragged) && 'opacity-50 shadow-lg ring-1 ring-offset-1',
        'border rounded-lg'
      )}
    >
      <CardContent className="p-0">
        {/* Drag Handle Bar at Top */}
        <div
          {...listeners}
          {...attributes}
          className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing transition-colors hover:opacity-80"
          style={{ backgroundColor: stageColor }}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
          </div>
        </div>

        {/* Card Content */}
        <div onClick={handleClick} className="p-2.5 space-y-2 cursor-pointer bg-white">
          {/* Customer Header with Actions */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate leading-tight">
                {job.customer.name}
              </h3>
              {job.customer.business_name && (
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{job.customer.business_name}</p>
              )}
              <span className="inline-block mt-0.5 font-mono text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                #{job.customer.customer_id}
              </span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onCustomerClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCustomerClick()
                  }}
                  title="View customer"
                >
                  <User className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete job"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Car Details */}
          <div className="flex items-start gap-1.5">
            <div className="flex-shrink-0 rounded bg-blue-50 p-1">
              <Car className="h-3 w-3 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-gray-900 truncate leading-tight">
                {job.car.make} {job.car.model}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                {job.car.color && <span>{job.car.color}</span>}
                {job.car.color && <span>•</span>}
                <span>{job.car.year}</span>
                {job.car.registration_plate && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{job.car.registration_plate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="bg-gray-50 rounded px-2 py-1.5">
            <p className="text-xs font-semibold text-gray-900">{job.service.name}</p>
            {job.job_add_ons && job.job_add_ons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {job.job_add_ons.map((ja) => (
                  <span
                    key={ja.add_on.id}
                    className="inline-flex items-center text-[9px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded"
                  >
                    + {ja.add_on.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-1.5">
            <div className="flex-shrink-0 rounded bg-purple-50 p-1">
              <Calendar className="h-3 w-3 text-purple-600" />
            </div>
            <span className="text-xs font-semibold text-gray-900">{formatDate(job.booking_datetime)}</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="flex-shrink-0 rounded bg-emerald-50 p-1">
                <PoundSterling className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-gray-900">{formatPrice(job.total_price)}</span>
            </div>

            <div className="flex items-center gap-1">
              {isSynced && (
                <div
                  className="flex items-center justify-center w-5 h-5 rounded bg-blue-50"
                  title="Synced to Google Calendar"
                >
                  <CalendarCheck className="h-2.5 w-2.5 text-blue-600" />
                </div>
              )}
              {job.last_synced_from_google && (
                <div
                  className="flex items-center justify-center w-5 h-5 rounded bg-purple-50"
                  title={`Updated from Google Calendar: ${format(new Date(job.last_synced_from_google), 'PPp')}`}
                >
                  <ArrowDownToLine className="h-2.5 w-2.5 text-purple-600" />
                </div>
              )}
              {job.deposit_paid && (
                <div className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>Deposit</span>
                </div>
              )}
              {job.source !== 'manual' && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{
                    backgroundColor: job.source === 'sophie' ? '#dbeafe' : '#fef3c7',
                    color: job.source === 'sophie' ? '#1e40af' : '#92400e',
                  }}
                >
                  {job.source}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

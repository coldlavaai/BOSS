'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowDownToLine } from 'lucide-react'
import { format } from 'date-fns'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

interface EditJobDialogProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobUpdated: () => void
}

export function EditJobDialog({
  job,
  open,
  onOpenChange,
  onJobUpdated,
}: EditJobDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [services, setServices] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])

  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState('')
  const [bookingDatetime, setBookingDatetime] = useState('')
  const [depositPaid, setDepositPaid] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([])
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])

  const supabase = createClient()

  // Load job data when dialog opens
  useEffect(() => {
    if (job && open) {
      setSelectedStageId(job.pipeline_stage_id || '')
      setSelectedServiceId(job.service_id || '')
      setSelectedCarId(job.car_id || '')
      setTotalPrice((job.total_price / 100).toFixed(2))
      setBookingDatetime(job.booking_datetime ? format(new Date(job.booking_datetime), "yyyy-MM-dd'T'HH:mm") : '')
      setDepositPaid(job.deposit_paid || false)
      setDepositAmount(job.deposit_amount ? (job.deposit_amount / 100).toFixed(2) : '')
      setNotes(job.notes || '')
      loadStages()
      loadServices()
      loadCustomerCars(job.customer_id)
      loadJobAddOns(job.id)
      if (job.service_id) {
        loadServiceAddOns(job.service_id)
      }
    }
  }, [job, open])

  // Load available add-ons when service changes
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== job?.service_id) {
      loadServiceAddOns(selectedServiceId)
      setSelectedAddOnIds([]) // Reset selections when service changes
    }
  }, [selectedServiceId])

  const loadStages = async () => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('is_archived', false)
      .order('display_order')

    if (data) setStages(data)
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('name')

    if (data) setServices(data)
  }

  const loadCustomerCars = async (customerId: string) => {
    const { data } = await supabase
      .from('cars')
      .select('*')
      .eq('customer_id', customerId)
      .order('make, model')

    if (data) setCars(data)
  }

  const loadJobAddOns = async (jobId: string) => {
    const { data } = await supabase
      .from('job_add_ons')
      .select('add_on_id')
      .eq('job_id', jobId)

    if (data) {
      setSelectedAddOnIds(data.map(ja => ja.add_on_id))
    }
  }

  const loadServiceAddOns = async (serviceId: string) => {
    const { data } = await supabase
      .from('service_add_ons')
      .select(`
        add_on:add_ons(*)
      `)
      .eq('service_id', serviceId)
      .order('display_order')

    if (data) {
      const addOns = data.map(item => item.add_on).filter(Boolean)
      setAvailableAddOns(addOns)
    }
  }

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOnIds(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    setLoading(true)
    setError(null)

    try {
      const depositAmountInPence = depositPaid && depositAmount
        ? Math.round(parseFloat(depositAmount) * 100)
        : null

      const totalPriceInPence = totalPrice ? Math.round(parseFloat(totalPrice) * 100) : 0

      const { error: submitError } = await supabase
        .from('jobs')
        .update({
          service_id: selectedServiceId,
          car_id: selectedCarId,
          total_price: totalPriceInPence,
          pipeline_stage_id: selectedStageId,
          booking_datetime: bookingDatetime,
          deposit_paid: depositPaid,
          deposit_amount: depositAmountInPence,
          notes: notes || null,
        })
        .eq('id', job.id)

      if (submitError) {
        setError(submitError.message)
        return
      }

      // Update job add-ons
      // First delete existing add-ons
      await supabase
        .from('job_add_ons')
        .delete()
        .eq('job_id', job.id)

      // Then insert new selections
      if (selectedAddOnIds.length > 0) {
        const jobAddOns = selectedAddOnIds.map(addonId => ({
          job_id: job.id,
          add_on_id: addonId
        }))

        await supabase.from('job_add_ons').insert(jobAddOns)
      }

      // Sync to Google Calendar
      try {
        const syncResponse = await fetch('/api/calendar/sync-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id }),
        })

        if (!syncResponse.ok) {
          const syncError = await syncResponse.json()
          console.error('Failed to sync to calendar:', syncError)
          // Show warning but don't block job update
          alert(`Job updated but failed to sync to Google Calendar: ${syncError.error || 'Unknown error'}`)
        }
      } catch (err) {
        console.error('Failed to sync to calendar:', err)
        alert('Job updated but failed to sync to Google Calendar. Check your Google Calendar connection.')
      }

      onJobUpdated()
      onOpenChange(false)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!job) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this job? This will also remove it from your synced Google Calendar if connected.'
    )

    if (!confirmed) return

    setLoading(true)
    setError(null)

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

      onJobUpdated()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete job')
    } finally {
      setLoading(false)
    }
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update job details for {job.customer.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info (Read-only) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-medium">Customer:</span> {job.customer.name}
              {job.customer.business_name && <span className="text-gray-600"> ({job.customer.business_name})</span>}
            </div>
          </div>

          {/* Car Selection */}
          <div className="space-y-2">
            <Label htmlFor="car">
              Vehicle <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedCarId}
              onValueChange={setSelectedCarId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {cars.map((car) => (
                  <SelectItem key={car.id} value={car.id}>
                    {car.make} {car.model} ({car.year}) {car.registration_plate && `- ${car.registration_plate}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">
              Service <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add-ons Selection */}
          {availableAddOns.length > 0 && (
            <div className="space-y-3 border border-blue-200 rounded-lg p-4 bg-blue-50">
              <Label className="text-sm font-semibold">Available Add-ons (Optional)</Label>
              <div className="space-y-2">
                {availableAddOns.map((addon: any) => (
                  <div key={addon.id} className="flex items-start gap-3 bg-white p-3 rounded border border-gray-200">
                    <Checkbox
                      id={`addon-${addon.id}`}
                      checked={selectedAddOnIds.includes(addon.id)}
                      onCheckedChange={() => toggleAddOn(addon.id)}
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`addon-${addon.id}`} className="font-medium cursor-pointer">
                        {addon.name}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">{addon.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {addon.is_variable_price ? 'P.O.A' : `£${(addon.price_incl_vat / 100).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="total_price">
              Total Price (£) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="total_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Two-Way Sync Indicator */}
          {job.last_synced_from_google && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-purple-900">
                <ArrowDownToLine className="h-4 w-4" />
                <div>
                  <span className="font-medium">Synced from Google Calendar</span>
                  <div className="text-xs text-purple-700 mt-0.5">
                    Last updated: {format(new Date(job.last_synced_from_google), 'PPp')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="booking_datetime">
              Booking Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="booking_datetime"
              type="datetime-local"
              value={bookingDatetime}
              onChange={(e) => setBookingDatetime(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Pipeline Stage Selection */}
          <div className="space-y-2">
            <Label htmlFor="stage">
              Pipeline Stage <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedStageId}
              onValueChange={setSelectedStageId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deposit Information */}
          <div className="space-y-3 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deposit_paid"
                checked={depositPaid}
                onCheckedChange={(checked) => setDepositPaid(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="deposit_paid" className="font-normal cursor-pointer">
                Deposit paid
              </Label>
            </div>

            {depositPaid && (
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Deposit Amount (£)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete Job
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedStageId || !bookingDatetime || !selectedServiceId || !selectedCarId || !totalPrice}
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { trackEvent } from '@/lib/analytics/track-event'
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
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/types/services'
import { CheckCircle2, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import { AddCarDialog } from '@/components/customers/AddCarDialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type Customer = Database['public']['Tables']['customers']['Row']
type Car = Database['public']['Tables']['cars']['Row']
type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type Job = Database['public']['Tables']['jobs']['Row']

interface Service {
  id: string
  category_id: string
  name: string
  duration_text: string
  duration_hours: number
  duration_minutes: number
  remote_bookable: boolean
  requires_quote: boolean
  pricing: Array<{
    vehicle_size: string
    price_incl_vat: number
  }>
}

interface AddOn {
  id: string
  name: string
  description: string
  price_incl_vat: number
  is_variable_price: boolean
}

interface ServiceCategory {
  id: string
  name: string
}

interface CreateJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobCreated: (job: Job) => void
  defaultDate?: Date
}

export function CreateJobDialog({
  open,
  onOpenChange,
  onJobCreated,
  defaultDate,
}: CreateJobDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [showConflictWarning, setShowConflictWarning] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([])

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])

  const [bookingDate, setBookingDate] = useState<Date>()
  const [bookingHour, setBookingHour] = useState('08')
  const [bookingMinute, setBookingMinute] = useState('00')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours')
  const [depositPaid, setDepositPaid] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true)

  const [basePrice, setBasePrice] = useState(0)
  const [addOnsTotal, setAddOnsTotal] = useState(0)

  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false)
  const [showAddCarDialog, setShowAddCarDialog] = useState(false)

  const supabase = createClient()

  // Helper function to get combined datetime
  const getBookingDatetime = (): string | null => {
    if (!bookingDate) return null
    const combined = new Date(bookingDate)
    combined.setHours(parseInt(bookingHour), parseInt(bookingMinute), 0, 0)
    return combined.toISOString()
  }

  // Load initial data
  useEffect(() => {
    if (open) {
      loadInitialData()
      if (defaultDate) {
        setBookingDate(defaultDate)
        // Always default to 8am
        setBookingHour('08')
        setBookingMinute('00')
      }
    }
  }, [open, defaultDate])

  // Load cars when customer selected
  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerCars(selectedCustomerId)
      setSelectedCarId('')
    }
  }, [selectedCustomerId])

  // Load services when category selected
  useEffect(() => {
    if (selectedCategoryId) {
      loadCategoryServices(selectedCategoryId)
      setSelectedServiceId('')
      setAvailableAddOns([])
      setSelectedAddOnIds([])
    }
  }, [selectedCategoryId])

  // Load add-ons when service selected and set default duration
  useEffect(() => {
    if (selectedServiceId) {
      loadServiceAddOns(selectedServiceId)
      setSelectedAddOnIds([])

      // Set duration from service default
      const service = services.find(s => s.id === selectedServiceId)
      if (service && service.duration_minutes) {
        setDurationMinutes(service.duration_minutes)
        // Auto-select unit based on duration (>8 hours = days, otherwise hours)
        setDurationUnit(service.duration_minutes > 480 ? 'days' : 'hours')
      }
    }
  }, [selectedServiceId, services])

  // Calculate price when car and service selected
  useEffect(() => {
    if (selectedCarId && selectedServiceId) {
      calculateBasePrice()
    }
  }, [selectedCarId, selectedServiceId])

  // Calculate add-ons total when add-ons selection changes
  useEffect(() => {
    calculateAddOnsTotal()
  }, [selectedAddOnIds, availableAddOns])

  const loadInitialData = async () => {
    const [customersRes, categoriesRes, stagesRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('service_categories').select('*').order('display_order'),
      supabase.from('pipeline_stages').select('*').eq('is_archived', false).order('display_order'),
    ])

    if (customersRes.data) setCustomers(customersRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (stagesRes.data) {
      setStages(stagesRes.data)
      const newBookingStage = stagesRes.data.find(s => s.name === 'New Booking')
      if (newBookingStage) setSelectedStageId(newBookingStage.id)
    }
  }

  const loadCustomerCars = async (customerId: string) => {
    const { data } = await supabase
      .from('cars')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (data) setCars(data)
  }

  const loadCategoryServices = async (categoryId: string) => {
    const { data } = await supabase
      .from('services')
      .select(`
        *,
        pricing:service_pricing(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('display_order')

    if (data) setServices(data as any)
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
      const addOns = data.map(item => item.add_on).filter(Boolean) as unknown as AddOn[]
      setAvailableAddOns(addOns)
    }
  }

  const calculateBasePrice = async () => {
    const car = cars.find((c) => c.id === selectedCarId)
    const service = services.find((s) => s.id === selectedServiceId)

    if (!car || !service) return

    // Map car size to vehicle_size in pricing table
    const sizeMap: Record<string, string> = {
      'Small': 'small',
      'Medium': 'medium',
      'Large': 'large',
      'XL': 'xl'
    }

    const vehicleSize = sizeMap[car.size_category]

    // First check for customer-specific pricing
    const { data: customPricing, error: pricingError } = await supabase
      .from('customer_service_pricing')
      .select('price_incl_vat')
      .eq('customer_id', selectedCustomerId)
      .eq('service_id', selectedServiceId)
      .eq('vehicle_size', vehicleSize)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().split('T')[0])
      .maybeSingle() // Use maybeSingle instead of single to handle 0 rows gracefully

    if (customPricing) {
      // Use custom pricing
      setBasePrice(customPricing.price_incl_vat)
      return
    }

    // Fall back to standard pricing
    const pricing = service.pricing.find(p => p.vehicle_size === vehicleSize)

    if (pricing) {
      setBasePrice(pricing.price_incl_vat)
    }
  }

  const calculateAddOnsTotal = () => {
    const total = selectedAddOnIds.reduce((sum, addonId) => {
      const addon = availableAddOns.find(a => a.id === addonId)
      return sum + (addon?.price_incl_vat || 0)
    }, 0)
    setAddOnsTotal(total)
  }

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOnIds(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    // Add the new customer to the list
    setCustomers(prev => [...prev, newCustomer])
    // Auto-select the new customer
    setSelectedCustomerId(newCustomer.id)
    // Close the add customer dialog
    setShowAddCustomerDialog(false)
  }

  const handleCarAdded = (newCar: Car) => {
    // Add the new car to the list
    setCars(prev => [...prev, newCar])
    // Auto-select the new car
    setSelectedCarId(newCar.id)
    // Close the add car dialog
    setShowAddCarDialog(false)
  }

  const checkForConflicts = async () => {
    const bookingDatetime = getBookingDatetime()
    if (!bookingDatetime || !selectedServiceId) return []

    const service = services.find((s) => s.id === selectedServiceId)
    if (!service) return []

    const startTime = new Date(bookingDatetime)
    // Use the custom duration or fall back to service default
    const durationMs = durationMinutes * 60 * 1000
    const endTime = new Date(startTime.getTime() + durationMs)

    try {
      const response = await fetch('/api/calendar/check-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const data = await response.json()
      return data.conflicts || []
    } catch (err) {
      console.error('Error checking conflicts:', err)
      return []
    }
  }

  const handleSubmit = async (e: React.FormEvent, forceBook = false) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Track job creation timing
    const startTime = Date.now()

    try {
      // Validate required fields
      if (!selectedStageId) {
        setError('Please select a pipeline stage')
        setLoading(false)
        return
      }

      if (!selectedServiceId) {
        setError('Please select a service')
        setLoading(false)
        return
      }

      if (!selectedCustomerId || !selectedCarId) {
        setError('Please select a customer and vehicle')
        setLoading(false)
        return
      }

      // Check for conflicts
      if (!forceBook) {
        const conflictList = await checkForConflicts()
        if (conflictList.length > 0) {
          setConflicts(conflictList)
          setShowConflictWarning(true)
          setLoading(false)
          return
        }
      }

      const depositAmountInPence = depositPaid && depositAmount
        ? Math.round(parseFloat(depositAmount) * 100)
        : null

      const totalPrice = basePrice + addOnsTotal
      const bookingDatetime = getBookingDatetime()

      if (!bookingDatetime) {
        setError('Please select a booking date and time')
        setLoading(false)
        return
      }

      const { data, error: submitError } = await supabase
        .from('jobs')
        .insert([
          {
            customer_id: selectedCustomerId,
            car_id: selectedCarId,
            service_id: selectedServiceId,
            pipeline_stage_id: selectedStageId,
            booking_datetime: bookingDatetime,
            duration_minutes: durationMinutes,
            base_price: basePrice,
            total_price: totalPrice,
            deposit_paid: depositPaid,
            deposit_amount: depositAmountInPence,
            source: 'manual',
            notes: notes || null,
          },
        ])
        .select()
        .single()

      if (submitError) {
        console.error('Job creation error:', submitError)
        setError(submitError.message)
        return
      }

      if (data) {
        console.log('Job created successfully:', data.id)

        // Insert selected add-ons
        if (selectedAddOnIds.length > 0) {
          const jobAddOns = selectedAddOnIds.map(addonId => ({
            job_id: data.id,
            add_on_id: addonId
          }))

          const { error: addOnsError } = await supabase.from('job_add_ons').insert(jobAddOns)
          if (addOnsError) {
            console.error('Error inserting add-ons:', addOnsError)
          } else {
            console.log(`Inserted ${jobAddOns.length} add-ons`)
          }
        }

        // Sync to Google Calendar
        try {
          const syncResponse = await fetch('/api/calendar/sync-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: data.id }),
          })

          if (!syncResponse.ok) {
            console.error('Failed to sync to calendar')
            alert('Job created but failed to sync to Google Calendar.')
          } else {
            console.log('Job synced to calendar successfully')
          }
        } catch (err) {
          console.error('Failed to sync to calendar:', err)
        }

        // Trigger email automation (only if checkbox is checked)
        if (sendConfirmationEmail) {
          try {
            console.log('Triggering email automation for job:', data.id)
            const automationResponse = await fetch('/api/trigger-automation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                triggerType: 'new_booking',
                jobId: data.id,
                customerId: selectedCustomerId,
              }),
            })

            if (automationResponse.ok) {
              const automationResult = await automationResponse.json()
              console.log('Automation triggered:', automationResult)
              if (automationResult.emailsSent > 0) {
                console.log(`✉️ Sent ${automationResult.emailsSent} automated email(s)`)
              }
            } else {
              console.error('Failed to trigger automation')
            }
          } catch (err) {
            console.error('Failed to trigger automation:', err)
          }
        } else {
          console.log('Skipping email automation (checkbox unchecked)')
        }

        console.log('Calling onJobCreated callback')

        // Track successful job creation
        await trackEvent({
          eventType: 'job_created',
          category: 'user_action',
          durationMs: Date.now() - startTime,
          success: true,
          data: {
            service_id: selectedServiceId,
            has_addons: selectedAddOnIds.length > 0,
            addon_count: selectedAddOnIds.length,
            vehicle_size: cars.find(c => c.id === selectedCarId)?.size_category,
            total_price: totalPrice,
            has_deposit: depositPaid,
          },
        })

        onJobCreated(data)
        resetForm()
        setShowConflictWarning(false)
        setConflicts([])
      } else {
        console.error('No data returned from job insert')
        setError('Job creation failed - no data returned')

        // Track failure
        await trackEvent({
          eventType: 'job_created',
          category: 'error',
          durationMs: Date.now() - startTime,
          success: false,
          errorMessage: 'No data returned from job insert',
        })
      }
    } catch (err) {
      console.error('Unexpected error during job creation:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)

      // Track error
      await trackEvent({
        eventType: 'job_created',
        category: 'error',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedCustomerId('')
    setSelectedCarId('')
    setSelectedServiceId('')
    setSelectedCategoryId('')
    setSelectedAddOnIds([])
    setBookingDate(undefined)
    setBookingHour('08')
    setBookingMinute('00')
    setDepositPaid(false)
    setDepositAmount('')
    setSendConfirmationEmail(true)
    setNotes('')
    setBasePrice(0)
    setAddOnsTotal(0)
    setCars([])
    setServices([])
    setAvailableAddOns([])
    const newBookingStage = stages.find(s => s.name === 'New Booking')
    if (newBookingStage) setSelectedStageId(newBookingStage.id)
  }

  const selectedCar = cars.find((c) => c.id === selectedCarId)
  const selectedService = services.find((s) => s.id === selectedServiceId)
  const totalPrice = basePrice + addOnsTotal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Add a new job to the pipeline with optional add-ons
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer <span className="text-red-500">*</span></Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCustomerDialog(true)}
                disabled={loading}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Customer
              </Button>
            </div>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Car Selection */}
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label>Vehicle <span className="text-red-500">*</span></Label>
              {cars.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">No vehicles added yet</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddCarDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedCarId} onValueChange={setSelectedCarId} disabled={loading}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.make} {car.model} ({car.year}) - {car.size_category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddCarDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Service Category */}
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label>Service Category <span className="text-red-500">*</span></Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service Selection */}
          {selectedCategoryId && (
            <div className="space-y-2">
              <Label>Service <span className="text-red-500">*</span></Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} {service.requires_quote && <Badge variant="outline" className="ml-2">P.O.A</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add-ons Selection */}
          {selectedServiceId && availableAddOns.length > 0 && (
            <div className="space-y-3 border border-blue-200 rounded-lg p-4 bg-blue-50">
              <Label className="text-sm font-semibold">Available Add-ons (Optional)</Label>
              <div className="space-y-2">
                {availableAddOns.map((addon) => (
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
                        {addon.is_variable_price ? 'P.O.A' : formatPrice(addon.price_incl_vat)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Display */}
          {basePrice > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Service Price ({selectedCar?.size_category}):</span>
                <span className="font-semibold">{formatPrice(basePrice)}</span>
              </div>
              {addOnsTotal > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Add-ons ({selectedAddOnIds.length}):</span>
                    <span className="font-semibold">{formatPrice(addOnsTotal)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2"></div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-900 font-semibold">Total Price (inc VAT):</span>
                <span className="text-2xl font-bold" style={{ color: '#d52329' }}>
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <div className="bg-white border border-gray-300 rounded p-3 mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Price ex VAT:</span>
                  <span className="font-medium text-gray-900">{formatPrice(Math.round(totalPrice / 1.2))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">VAT (20%):</span>
                  <span className="font-medium text-gray-900">{formatPrice(totalPrice - Math.round(totalPrice / 1.2))}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5">
                  <span className="font-semibold text-gray-700">Total inc VAT:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              {selectedService && (
                <div className="text-xs text-gray-500 mt-2">
                  Duration: {selectedService.duration_text}
                </div>
              )}
            </div>
          )}

          {/* Booking Date/Time */}
          <div className="space-y-2">
            <Label>Booking Date & Time <span className="text-red-500">*</span></Label>
            <div className="grid gap-3">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bookingDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={setBookingDate}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>

              {/* Time Picker */}
              <div className="flex gap-2 items-center">
                <Clock className="h-4 w-4 text-gray-500" />
                <Select value={bookingHour} onValueChange={setBookingHour} disabled={loading}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0')
                      return (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <span className="text-gray-500">:</span>
                <Select value={bookingMinute} onValueChange={setBookingMinute} disabled={loading}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Duration */}
          {selectedServiceId && (
            <div className="space-y-2">
              <Label>Appointment Duration</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={durationUnit === 'hours' ? durationMinutes / 60 : durationMinutes / 480}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0.5
                    const minutes = durationUnit === 'hours' ? Math.round(value * 60) : Math.round(value * 480)
                    // Clamp to valid range (30 min to 7 days)
                    const clampedMinutes = Math.max(30, Math.min(10080, minutes))
                    setDurationMinutes(clampedMinutes)
                  }}
                  disabled={loading}
                  className="w-24"
                />
                <Select
                  value={durationUnit}
                  onValueChange={(value: 'hours' | 'days') => setDurationUnit(value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
                {selectedService && selectedService.duration_minutes !== durationMinutes && (
                  <span className="text-xs text-blue-600">
                    (Default: {selectedService.duration_minutes / 60}h)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Half-hour increments (0.5h - 8h), then days for longer services
              </p>
            </div>
          )}

          {/* Pipeline Stage */}
          <div className="space-y-2">
            <Label>Pipeline Stage <span className="text-red-500">*</span></Label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deposit */}
          <div className="space-y-3 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deposit_paid"
                checked={depositPaid}
                onCheckedChange={(checked) => setDepositPaid(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="deposit_paid" className="font-normal cursor-pointer">Deposit paid</Label>
            </div>
            {depositPaid && (
              <div className="space-y-2">
                <Label>Deposit Amount (£)</Label>
                <Input
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

          {/* Send Confirmation Email */}
          <div className="space-y-3 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_confirmation_email"
                checked={sendConfirmationEmail}
                onCheckedChange={(checked) => setSendConfirmationEmail(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="send_confirmation_email" className="font-normal cursor-pointer">
                Send booking confirmation email
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              Uncheck if adding a past job for tracking purposes or creating a test booking
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
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

          {showConflictWarning && conflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 text-amber-600">⚠️</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-2">Scheduling Conflict</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    The following event(s) overlap with your selected time:
                  </p>
                  <div className="space-y-2">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-sm bg-white rounded p-2 border border-amber-200">
                        <div className="font-medium">{conflict.title}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(conflict.start).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-amber-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowConflictWarning(false)
                    setConflicts([])
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Book Anyway
                </Button>
              </div>
            </div>
          )}

          {!showConflictWarning && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedCustomerId || !selectedCarId || !selectedServiceId || !bookingDate || !selectedStageId}
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                {loading ? 'Creating...' : 'Create Job'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onCustomerAdded={handleCustomerAdded}
      />

      {selectedCustomerId && (
        <AddCarDialog
          customerId={selectedCustomerId}
          customerName={customers.find((c) => c.id === selectedCustomerId)?.name || ''}
          open={showAddCarDialog}
          onOpenChange={setShowAddCarDialog}
          onCarAdded={handleCarAdded}
        />
      )}
    </Dialog>
  )
}

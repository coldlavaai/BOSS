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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Customer = Database['public']['Tables']['customers']['Row']

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerAdded: (customer: Customer) => void
  initialEmail?: string
  initialName?: string
}

export function AddCustomerDialog({
  open,
  onOpenChange,
  onCustomerAdded,
  initialEmail,
  initialName,
}: AddCustomerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: initialEmail || '',
    phone: '',
    business_name: '',
    notes: '',
  })

  // Update form data when initial values change
  useEffect(() => {
    if (open && (initialEmail || initialName)) {
      // Split initialName into first and last if provided
      const nameParts = initialName ? initialName.trim().split(' ') : []
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      setFormData(prev => ({
        ...prev,
        email: initialEmail || prev.email,
        first_name: firstName || prev.first_name,
        last_name: lastName || prev.last_name,
      }))
    }
  }, [open, initialEmail, initialName])

  const [addVehicle, setAddVehicle] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    registration_plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    size_category: 'Medium' as 'Small' | 'Medium' | 'Large' | 'XL',
    color: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Track customer creation timing
    const startTime = Date.now()

    try {
      // Get the next customer ID
      const { data: nextIdData } = await supabase.rpc('generate_customer_id')
      const customerId = nextIdData || null

      // Construct full name from first and last
      const fullName = `${formData.first_name} ${formData.last_name}`.trim()

      const { data, error: submitError } = await supabase
        .from('customers')
        .insert([
          {
            customer_id: customerId,
            name: fullName,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            business_name: formData.business_name || null,
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (submitError) {
        let errorMessage = submitError.message
        if (submitError.code === '23505') {
          // Unique constraint violation
          if (submitError.message.includes('email')) {
            errorMessage = 'A customer with this email already exists'
            setError(errorMessage)
          } else if (submitError.message.includes('phone')) {
            errorMessage = 'A customer with this phone number already exists'
            setError(errorMessage)
          } else {
            errorMessage = 'This customer already exists'
            setError(errorMessage)
          }
        } else {
          setError(submitError.message)
        }

        // Track error
        await trackEvent({
          eventType: 'customer_created',
          category: 'error',
          durationMs: Date.now() - startTime,
          success: false,
          errorMessage,
        })

        return
      }

      if (data) {
        // Link existing email threads to this new customer based on email address
        try {
          const { error: linkError } = await supabase
            .from('email_threads')
            .update({ customer_id: data.id })
            .eq('user_id', data.user_id)
            .is('customer_id', null)
            .or(`from_email.eq.${data.email},to_emails.cs.{${data.email}}`)

          if (linkError) {
            console.error('Error linking existing emails to customer:', linkError)
          } else {
            console.log('Successfully linked existing email threads to new customer')
          }
        } catch (linkErr) {
          console.error('Exception linking emails:', linkErr)
        }

        // If addVehicle is checked, create the vehicle
        if (addVehicle && vehicleData.make && vehicleData.model) {
          try {
            const { error: vehicleError } = await supabase.from('cars').insert([
              {
                customer_id: data.id,
                registration_plate: vehicleData.registration_plate ? vehicleData.registration_plate.toUpperCase() : null,
                make: vehicleData.make,
                model: vehicleData.model,
                year: parseInt(vehicleData.year),
                size_category: vehicleData.size_category,
                size_override: true,
                color: vehicleData.color || null,
                notes: null,
              },
            ])

            if (vehicleError) {
              console.error('Error creating vehicle:', vehicleError)
              alert(`Customer created but failed to add vehicle: ${vehicleError.message}. You can add it manually.`)
            }
          } catch (vehicleErr) {
            console.error('Exception creating vehicle:', vehicleErr)
            alert('Customer created but failed to add vehicle. You can add it manually.')
          }
        }

        // Track successful customer creation
        await trackEvent({
          eventType: 'customer_created',
          category: 'user_action',
          durationMs: Date.now() - startTime,
          success: true,
          data: {
            has_business_name: !!formData.business_name,
            has_notes: !!formData.notes,
            added_vehicle: addVehicle,
          },
        })

        onCustomerAdded(data)
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          business_name: '',
          notes: '',
        })
        setAddVehicle(false)
        setVehicleData({
          registration_plate: '',
          make: '',
          model: '',
          year: new Date().getFullYear().toString(),
          size_category: 'Medium',
          color: '',
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)

      // Track error
      await trackEvent({
        eventType: 'customer_created',
        category: 'error',
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. Optionally add a vehicle at the same time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                placeholder="Smith"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name (Optional)</Label>
            <Input
              id="business_name"
              placeholder="Company Ltd"
              value={formData.business_name}
              onChange={(e) =>
                setFormData({ ...formData, business_name: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or preferences..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Add Vehicle Section */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add_vehicle"
                checked={addVehicle}
                onCheckedChange={(checked) => setAddVehicle(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="add_vehicle" className="font-medium cursor-pointer">
                Add Vehicle
              </Label>
            </div>

            {addVehicle && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="registration_plate">
                      Registration (Optional)
                    </Label>
                    <Input
                      id="registration_plate"
                      placeholder="AB12 CDE"
                      value={vehicleData.registration_plate}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, registration_plate: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">
                      Year <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="year"
                      type="number"
                      placeholder="2024"
                      value={vehicleData.year}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, year: e.target.value })
                      }
                      disabled={loading}
                      required={addVehicle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="make">
                      Make <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="make"
                      placeholder="BMW"
                      value={vehicleData.make}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, make: e.target.value })
                      }
                      disabled={loading}
                      required={addVehicle}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">
                      Model <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="model"
                      placeholder="M3"
                      value={vehicleData.model}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, model: e.target.value })
                      }
                      disabled={loading}
                      required={addVehicle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="size_category">
                      Size <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={vehicleData.size_category}
                      onValueChange={(value: any) =>
                        setVehicleData({ ...vehicleData, size_category: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Small">Small</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Large">Large</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color (Optional)</Label>
                    <Input
                      id="color"
                      placeholder="Black"
                      value={vehicleData.color}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, color: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter>
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
              disabled={loading}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

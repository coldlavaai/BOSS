'use client'

import { useState } from 'react'
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

type Car = Database['public']['Tables']['cars']['Row']

interface AddCarDialogProps {
  customerId: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCarAdded: (car: Car) => void
}

export function AddCarDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
  onCarAdded,
}: AddCarDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    registration_plate: '',
    size_category: 'Medium' as 'Small' | 'Medium' | 'Large' | 'XL',
    notes: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: submitError } = await supabase
        .from('cars')
        .insert([
          {
            customer_id: customerId,
            make: formData.make,
            model: formData.model,
            year: formData.year,
            color: formData.color || null,
            registration_plate: formData.registration_plate || null,
            size_category: formData.size_category,
            size_override: true, // User selected size manually
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (submitError) {
        setError(submitError.message)
        return
      }

      if (data) {
        onCarAdded(data)
        // Reset form
        setFormData({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          registration_plate: '',
          size_category: 'Medium',
          notes: '',
        })
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
          <DialogDescription>
            Add a new vehicle for {customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">
                Make <span className="text-red-500">*</span>
              </Label>
              <Input
                id="make"
                placeholder="e.g. BMW"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-red-500">*</span>
              </Label>
              <Input
                id="model"
                placeholder="e.g. 3 Series"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">
                Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g. Black"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_plate">Registration Plate</Label>
            <Input
              id="registration_plate"
              placeholder="e.g. AB12 CDE"
              value={formData.registration_plate}
              onChange={(e) => setFormData({ ...formData, registration_plate: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size_category">
              Vehicle Size <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.size_category}
              onValueChange={(value: any) => setFormData({ ...formData, size_category: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Small">Small (Hatchback, City Car)</SelectItem>
                <SelectItem value="Medium">Medium (Saloon, Estate)</SelectItem>
                <SelectItem value="Large">Large (SUV, MPV)</SelectItem>
                <SelectItem value="XL">XL (Large SUV, Van)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special details about this vehicle..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              rows={3}
            />
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
              {loading ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

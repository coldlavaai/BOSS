'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Service = Database['public']['Tables']['services']['Row'] & {
  category: Database['public']['Tables']['service_categories']['Row']
  pricing?: Array<{
    vehicle_size: string
    price_excl_vat: number
    price_incl_vat: number
  }>
}

type ServiceCategory = Database['public']['Tables']['service_categories']['Row']

interface EditServiceDialogProps {
  service: Service
  onClose: () => void
}

export function EditServiceDialog({ service, onClose }: EditServiceDialogProps) {
  const [name, setName] = useState(service.name)
  const [categoryId, setCategoryId] = useState(service.category_id)
  const [description, setDescription] = useState(service.description || '')
  const [durationText, setDurationText] = useState(service.duration_text || '')
  const [durationMinutes, setDurationMinutes] = useState(service.duration_minutes || 60)
  const [displayOrder, setDisplayOrder] = useState(service.display_order || 0)
  const [isActive, setIsActive] = useState(service.is_active)

  // Pricing state - prices in pence
  const [priceSmall, setPriceSmall] = useState(0)
  const [priceMedium, setPriceMedium] = useState(0)
  const [priceLarge, setPriceLarge] = useState(0)
  const [priceXL, setPriceXL] = useState(0)

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCategories()
    loadPricing()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadPricing = async () => {
    if (!service.pricing || service.pricing.length === 0) {
      // Fetch pricing if not provided
      const { data } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('service_id', service.id)

      if (data) {
        data.forEach(p => {
          if (p.vehicle_size === 'small') setPriceSmall(p.price_incl_vat)
          if (p.vehicle_size === 'medium') setPriceMedium(p.price_incl_vat)
          if (p.vehicle_size === 'large') setPriceLarge(p.price_incl_vat)
          if (p.vehicle_size === 'xl') setPriceXL(p.price_incl_vat)
        })
      }
    } else {
      // Use provided pricing
      service.pricing.forEach(p => {
        if (p.vehicle_size === 'small') setPriceSmall(p.price_incl_vat)
        if (p.vehicle_size === 'medium') setPriceMedium(p.price_incl_vat)
        if (p.vehicle_size === 'large') setPriceLarge(p.price_incl_vat)
        if (p.vehicle_size === 'xl') setPriceXL(p.price_incl_vat)
      })
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Service name is required')
      return
    }

    if (!categoryId) {
      setError('Service category is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update service details
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: name.trim(),
          category_id: categoryId,
          description: description.trim() || null,
          duration_text: durationText.trim() || null,
          duration_minutes: durationMinutes,
          display_order: displayOrder,
          is_active: isActive,
        })
        .eq('id', service.id)

      if (updateError) throw updateError

      // Update pricing for each vehicle size
      const sizes = [
        { size: 'small', price: priceSmall },
        { size: 'medium', price: priceMedium },
        { size: 'large', price: priceLarge },
        { size: 'xl', price: priceXL },
      ]

      for (const { size, price } of sizes) {
        const priceExclVat = Math.round(price / 1.2) // Remove 20% VAT

        // Try to update existing pricing record
        const { error: upsertError } = await supabase
          .from('service_pricing')
          .upsert({
            service_id: service.id,
            vehicle_size: size,
            price_excl_vat: priceExclVat,
            price_incl_vat: price,
          }, {
            onConflict: 'service_id,vehicle_size'
          })

        if (upsertError) throw upsertError
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  const convertToPence = (pounds: string) => {
    const value = parseFloat(pounds)
    return isNaN(value) ? 0 : Math.round(value * 100)
  }

  const convertToPounds = (pence: number) => {
    return (pence / 100).toFixed(2)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update service details and pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-sm">Basic Information</h3>

            {/* Service Name */}
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                placeholder="e.g. Full Detail"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              {loadingCategories ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading categories...</span>
                </div>
              ) : (
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                placeholder="Detailed description of the service"
                rows={3}
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration-text">Duration Text</Label>
                <Input
                  id="duration-text"
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. 2-3 hours"
                />
              </div>
              <div>
                <Label htmlFor="duration-minutes">Duration (minutes)</Label>
                <Input
                  id="duration-minutes"
                  type="number"
                  min="0"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Display Order and Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display-order">Display Order</Label>
                <Input
                  id="display-order"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4"
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Active (visible in service catalog)
                </Label>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-sm">Pricing by Vehicle Size (£ inc VAT)</h3>
            <p className="text-xs text-gray-500">Enter 0 for bespoke pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price-small">Small</Label>
                <Input
                  id="price-small"
                  type="number"
                  min="0"
                  step="1"
                  value={convertToPounds(priceSmall)}
                  onChange={(e) => setPriceSmall(convertToPence(e.target.value))}
                  disabled={saving}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="price-medium">Medium</Label>
                <Input
                  id="price-medium"
                  type="number"
                  min="0"
                  step="1"
                  value={convertToPounds(priceMedium)}
                  onChange={(e) => setPriceMedium(convertToPence(e.target.value))}
                  disabled={saving}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="price-large">Large</Label>
                <Input
                  id="price-large"
                  type="number"
                  min="0"
                  step="1"
                  value={convertToPounds(priceLarge)}
                  onChange={(e) => setPriceLarge(convertToPence(e.target.value))}
                  disabled={saving}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="price-xl">XL</Label>
                <Input
                  id="price-xl"
                  type="number"
                  min="0"
                  step="1"
                  value={convertToPounds(priceXL)}
                  onChange={(e) => setPriceXL(convertToPence(e.target.value))}
                  disabled={saving}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loadingCategories}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

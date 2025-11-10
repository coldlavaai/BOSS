'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Clock, Bot } from 'lucide-react'

type Service = Database['public']['Tables']['services']['Row']

interface ServiceDurationSettingsProps {
  services: Service[]
}

type DurationUnit = 'hours' | 'days'

export function ServiceDurationSettings({ services: initialServices }: ServiceDurationSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [services, setServices] = useState(initialServices)
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState<Record<string, DurationUnit>>({})

  // Get initial unit for a service based on duration
  const getInitialUnit = (minutes: number): DurationUnit => {
    if (minutes > 480) return 'days'  // More than 8 hours = days
    return 'hours'
  }

  // Convert minutes to display value based on unit
  const minutesToUnit = (minutes: number, unit: DurationUnit): number => {
    switch (unit) {
      case 'hours': return minutes / 60  // Convert to decimal hours (e.g., 90 min = 1.5 hours)
      case 'days': return minutes / 480   // 1 day = 8 hours = 480 minutes
      default: return minutes
    }
  }

  // Convert display value to minutes based on unit
  const unitToMinutes = (value: number, unit: DurationUnit): number => {
    switch (unit) {
      case 'hours': return Math.round(value * 60)  // Round to nearest minute
      case 'days': return Math.round(value * 480)
      default: return value
    }
  }

  // Get or initialize unit for a service
  const getUnit = (serviceId: string, defaultMinutes: number): DurationUnit => {
    if (!units[serviceId]) {
      return getInitialUnit(defaultMinutes)
    }
    return units[serviceId]
  }

  const updateService = (id: string, field: 'duration_minutes' | 'remote_bookable', value: number | boolean) => {
    setServices(
      services.map((service) =>
        service.id === id ? { ...service, [field]: value } : service
      )
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Update each service
      const updates = services.map((service) =>
        supabase
          .from('services')
          .update({
            duration_minutes: service.duration_minutes,
            remote_bookable: service.remote_bookable,
          })
          .eq('id', service.id)
      )

      const results = await Promise.all(updates)

      // Check for errors
      const errors = results.filter((result) => result.error)
      if (errors.length > 0) {
        console.error('Errors updating services:', errors)
        throw new Error('Some services failed to update')
      }

      router.refresh()
      alert('Service duration settings saved successfully!')
    } catch (error) {
      console.error('Error saving service settings:', error)
      alert('Failed to save service settings')
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`

    // For durations over 8 hours, show in days
    if (minutes >= 480) {
      const days = Math.floor(minutes / 480)
      const remainingHours = Math.floor((minutes % 480) / 60)
      if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`
      }
      return `${days}d`
    }

    // For shorter durations, show hours and minutes
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Duration Settings</h2>
          <p className="text-gray-600 mt-1">
            Set appointment durations and remote booking availability for Rosie (AI agent)
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Service Durations & Remote Booking
          </CardTitle>
          <CardDescription>
            Configure how long each service takes and whether Rosie can book it automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 border rounded-lg font-semibold text-sm">
              <div className="col-span-5">Service Name</div>
              <div className="col-span-3">Duration (minutes)</div>
              <div className="col-span-2 text-center">Display</div>
              <div className="col-span-2 text-center flex items-center gap-1">
                <Bot className="h-4 w-4" />
                <span>Remote Bookable</span>
              </div>
            </div>

            {/* Service Rows */}
            {services.map((service) => (
              <div
                key={service.id}
                className="grid grid-cols-12 gap-4 p-4 border rounded-lg items-center hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-5">
                  <div className="font-medium">{service.name}</div>
                  {service.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {service.description}
                    </div>
                  )}
                </div>

                <div className="col-span-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0.5"
                      step={getUnit(service.id, service.duration_minutes) === 'hours' ? '0.5' : '0.5'}
                      value={minutesToUnit(service.duration_minutes, getUnit(service.id, service.duration_minutes))}
                      onChange={(e) => {
                        const unit = getUnit(service.id, service.duration_minutes)
                        const value = parseFloat(e.target.value) || 0.5
                        const minutes = unitToMinutes(value, unit)
                        // Clamp to valid range (30 min to 7 days)
                        const clampedMinutes = Math.max(30, Math.min(10080, minutes))
                        updateService(service.id, 'duration_minutes', clampedMinutes)
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={getUnit(service.id, service.duration_minutes)}
                      onValueChange={(value: DurationUnit) => {
                        setUnits({ ...units, [service.id]: value })
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    0.5 hours - 7 days
                  </div>
                </div>

                <div className="col-span-2 text-center">
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {formatDuration(service.duration_minutes)}
                  </div>
                </div>

                <div className="col-span-2 flex justify-center">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.remote_bookable}
                      onCheckedChange={(checked) =>
                        updateService(service.id, 'remote_bookable', checked)
                      }
                    />
                    <span className="text-sm">
                      {service.remote_bookable ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {services.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No services found. Add services first to configure their durations.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bot className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">Remote Booking for Rosie (AI Agent)</p>
              <p className="text-blue-800">
                <strong>Enabled:</strong> Rosie can automatically book this service into the calendar based on availability.
              </p>
              <p className="text-blue-800">
                <strong>Disabled:</strong> Rosie will take customer details and schedule a callback for manual booking.
              </p>
              <p className="text-blue-700 text-xs mt-3">
                Duration is used for: 1) Rosie's availability calculations, 2) Default duration in manual booking (can be overridden).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

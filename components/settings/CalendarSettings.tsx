'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Clock, Calendar as CalendarIcon } from 'lucide-react'

type CalendarSettingsType = Database['public']['Tables']['calendar_settings']['Row']

interface CalendarSettingsProps {
  initialSettings: CalendarSettingsType | null
}

export function CalendarSettings({ initialSettings }: CalendarSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<Partial<CalendarSettingsType>>(
    initialSettings || {
      monday_enabled: true,
      tuesday_enabled: true,
      wednesday_enabled: true,
      thursday_enabled: true,
      friday_enabled: true,
      saturday_enabled: true,
      sunday_enabled: false,
      monday_open: '08:00:00',
      monday_close: '18:00:00',
      tuesday_open: '08:00:00',
      tuesday_close: '18:00:00',
      wednesday_open: '08:00:00',
      wednesday_close: '18:00:00',
      thursday_open: '08:00:00',
      thursday_close: '18:00:00',
      friday_open: '08:00:00',
      friday_close: '18:00:00',
      saturday_open: '08:00:00',
      saturday_close: '14:00:00',
      buffer_minutes: 15,
      lunch_break_enabled: false,
      min_booking_hours: 24,
      max_booking_days: 30,
    }
  )

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

  const handleSave = async () => {
    try {
      setSaving(true)

      if (initialSettings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('calendar_settings')
          .update(settings)
          .eq('id', initialSettings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { error } = await supabase.from('calendar_settings').insert([settings])

        if (error) throw error
      }

      router.refresh()
      alert('Calendar settings saved successfully!')
    } catch (error) {
      console.error('Error saving calendar settings:', error)
      alert('Failed to save calendar settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar & Business Hours</h2>
          <p className="text-gray-600 mt-1">
            Configure when Detail Dynamics is available for appointments
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Set your operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((day) => {
            const enabledKey = `${day.key}_enabled` as keyof typeof settings
            const openKey = `${day.key}_open` as keyof typeof settings
            const closeKey = `${day.key}_close` as keyof typeof settings
            const isEnabled = settings[enabledKey] as boolean

            return (
              <div key={day.key} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-28">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, [enabledKey]: checked })
                    }
                  />
                  <Label className="ml-2 font-medium">{day.label}</Label>
                </div>

                {isEnabled ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600">Open:</Label>
                      <Input
                        type="time"
                        value={settings[openKey] as string}
                        onChange={(e) =>
                          setSettings({ ...settings, [openKey]: e.target.value })
                        }
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600">Close:</Label>
                      <Input
                        type="time"
                        value={settings[closeKey] as string}
                        onChange={(e) =>
                          setSettings({ ...settings, [closeKey]: e.target.value })
                        }
                        className="w-32"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Closed</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Scheduling Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduling Rules
          </CardTitle>
          <CardDescription>
            Configure appointment buffers and booking windows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Buffer Time Between Appointments (minutes)</Label>
              <Input
                type="number"
                min="0"
                max="60"
                value={settings.buffer_minutes || 0}
                onChange={(e) =>
                  setSettings({ ...settings, buffer_minutes: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">
                Time needed for cleanup/preparation between jobs
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Booking Notice (hours)</Label>
              <Input
                type="number"
                min="0"
                max="168"
                value={settings.min_booking_hours || 0}
                onChange={(e) =>
                  setSettings({ ...settings, min_booking_hours: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">
                Minimum time in advance customers must book
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Booking Window (days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={settings.max_booking_days || 0}
                onChange={(e) =>
                  setSettings({ ...settings, max_booking_days: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">
                How far in advance customers can book
              </p>
            </div>
          </div>

          {/* Lunch Break */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Switch
                checked={settings.lunch_break_enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, lunch_break_enabled: checked })
                }
              />
              <Label className="font-medium">Enable Lunch Break</Label>
            </div>

            {settings.lunch_break_enabled && (
              <div className="flex items-center gap-4 ml-8">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">Start:</Label>
                  <Input
                    type="time"
                    value={settings.lunch_break_start || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, lunch_break_start: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">End:</Label>
                  <Input
                    type="time"
                    value={settings.lunch_break_end || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, lunch_break_end: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

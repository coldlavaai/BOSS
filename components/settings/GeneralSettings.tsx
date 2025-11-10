'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Moon, Sun, Save, Palette, RotateCcw, Eye, Clock, Layout } from 'lucide-react'

const DEFAULT_PRIMARY_COLOR = '#d52329'
const DEFAULT_SECONDARY_COLOR = '#32373c'

export function GeneralSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR)

  // Display preferences
  const [use24HourTime, setUse24HourTime] = useState(false)
  const [showSeconds, setShowSeconds] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [showCustomerIds, setShowCustomerIds] = useState(true)

  // Hydration fix for next-themes
  useEffect(() => {
    setMounted(true)

    // Load brand colors from localStorage
    const savedPrimary = localStorage.getItem('brand-primary')
    const savedSecondary = localStorage.getItem('brand-secondary')

    if (savedPrimary) {
      setPrimaryColor(savedPrimary)
      applyBrandColor('--brand-primary', savedPrimary)
    }
    if (savedSecondary) {
      setSecondaryColor(savedSecondary)
      applyBrandColor('--brand-secondary', savedSecondary)
    }

    // Load display preferences
    setUse24HourTime(localStorage.getItem('use-24-hour-time') === 'true')
    setShowSeconds(localStorage.getItem('show-seconds') === 'true')
    setCompactMode(localStorage.getItem('compact-mode') === 'true')
    setShowCustomerIds(localStorage.getItem('show-customer-ids') !== 'false') // default true
  }, [])

  const applyBrandColor = (variable: string, color: string) => {
    document.documentElement.style.setProperty(variable, color)
  }

  const handleSave = async () => {
    setSaving(true)

    // Save brand colors to localStorage
    localStorage.setItem('brand-primary', primaryColor)
    localStorage.setItem('brand-secondary', secondaryColor)

    // Apply brand colors
    applyBrandColor('--brand-primary', primaryColor)
    applyBrandColor('--brand-secondary', secondaryColor)

    // Save display preferences
    localStorage.setItem('use-24-hour-time', use24HourTime.toString())
    localStorage.setItem('show-seconds', showSeconds.toString())
    localStorage.setItem('compact-mode', compactMode.toString())
    localStorage.setItem('show-customer-ids', showCustomerIds.toString())

    setTimeout(() => setSaving(false), 1000)
  }

  const handleResetColors = () => {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR)
    setSecondaryColor(DEFAULT_SECONDARY_COLOR)
    localStorage.removeItem('brand-primary')
    localStorage.removeItem('brand-secondary')
    applyBrandColor('--brand-primary', DEFAULT_PRIMARY_COLOR)
    applyBrandColor('--brand-secondary', DEFAULT_SECONDARY_COLOR)
  }

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  const isDark = theme === 'dark'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-full transition-colors"
                style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}
              />
              <p className="text-sm font-medium">
                {isDark ? 'Dark theme active' : 'Light theme active'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Theme preference is saved automatically
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Customize how information is displayed throughout the CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="24-hour-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                24-Hour Time Format
              </Label>
              <p className="text-sm text-muted-foreground">
                Display time as 14:30 instead of 2:30 PM
              </p>
            </div>
            <Switch
              id="24-hour-time"
              checked={use24HourTime}
              onCheckedChange={setUse24HourTime}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-seconds">Show Seconds</Label>
              <p className="text-sm text-muted-foreground">
                Display seconds in time (14:30:45)
              </p>
            </div>
            <Switch
              id="show-seconds"
              checked={showSeconds}
              onCheckedChange={setShowSeconds}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-mode" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Compact Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing for a more dense interface
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-customer-ids">Show Customer IDs</Label>
              <p className="text-sm text-muted-foreground">
                Display customer ID numbers in lists and cards
              </p>
            </div>
            <Switch
              id="show-customer-ids"
              checked={showCustomerIds}
              onCheckedChange={setShowCustomerIds}
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Display preferences are saved locally and applied immediately
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Customize Detail Dynamics branding colors used throughout the CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Primary Red</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-lg border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => document.getElementById('primary-color-input')?.click()}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="primary-color-input"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#d52329"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons and accents</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Dark Gray</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-lg border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                  style={{ backgroundColor: secondaryColor }}
                  onClick={() => document.getElementById('secondary-color-input')?.click()}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color-input"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#32373c"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for headers and sidebar</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Colors are saved locally and applied immediately
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetColors}
              className="gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: primaryColor }}
          className="text-white hover:opacity-90"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

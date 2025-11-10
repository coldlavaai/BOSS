'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, Mail, MessageSquare, CheckCircle2, XCircle, Loader2, ArrowLeftRight, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

interface GoogleCalendarIntegration {
  id: string
  email: string
  calendar_id: string
  calendar_name: string | null
  sync_enabled: boolean
  two_way_sync_enabled: boolean
  last_sync_at: string | null
}

interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  primary: boolean
  backgroundColor: string
}

interface EmailIntegration {
  id: string
  provider: 'outlook' | 'gmail' | 'office365'
  email_address: string
  display_name: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
}

interface GmbIntegration {
  id: string
  business_name: string | null
  business_address: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
}

export function IntegrationsSettings() {
  const [googleIntegration, setGoogleIntegration] = useState<GoogleCalendarIntegration | null>(null)
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegration[]>([])
  const [gmbIntegration, setGmbIntegration] = useState<GmbIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [loadingGmb, setLoadingGmb] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectingEmail, setConnectingEmail] = useState<'gmail' | 'outlook' | null>(null)
  const [disconnectingEmail, setDisconnectingEmail] = useState<string | null>(null)
  const [syncingEmail, setSyncingEmail] = useState<string | null>(null)
  const [connectingGmb, setConnectingGmb] = useState(false)
  const [disconnectingGmb, setDisconnectingGmb] = useState(false)
  const [syncingGmb, setSyncingGmb] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [switchingCalendar, setSwitchingCalendar] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Load integration status on mount
  useEffect(() => {
    loadIntegrationStatus()
    loadEmailIntegrations()
    loadGmbIntegration()
  }, [])

  // Check for OAuth callback success/error
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'google_connected') {
      loadIntegrationStatus()
      router.replace('/settings?tab=integrations')
    }

    if (success === 'gmail_connected' || success === 'outlook_connected') {
      loadEmailIntegrations()
      router.replace('/settings?tab=integrations')
    }

    if (success === 'gmb_connected') {
      loadGmbIntegration()
      router.replace('/settings?tab=integrations')
    }

    if (error) {
      alert(`Error: ${error}`)
      router.replace('/settings?tab=integrations')
    }
  }, [searchParams])

  const loadIntegrationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('id, email, calendar_id, calendar_name, sync_enabled, two_way_sync_enabled, last_sync_at')
        .single()

      if (!error && data) {
        setGoogleIntegration(data)
      } else {
        setGoogleIntegration(null)
      }
    } catch (err) {
      console.error('Error loading integration:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadEmailIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('id, provider, email_address, display_name, is_active, last_sync_at, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setEmailIntegrations(data)
      } else {
        setEmailIntegrations([])
      }
    } catch (err) {
      console.error('Error loading email integrations:', err)
    } finally {
      setLoadingEmails(false)
    }
  }

  const loadGmbIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('gmb_integrations')
        .select('id, business_name, business_address, is_active, last_sync_at, created_at')
        .eq('is_active', true)
        .single()

      if (!error && data) {
        setGmbIntegration(data)
      } else {
        setGmbIntegration(null)
      }
    } catch (err) {
      console.error('Error loading GMB integration:', err)
    } finally {
      setLoadingGmb(false)
    }
  }

  const loadAvailableCalendars = async () => {
    setLoadingCalendars(true)
    try {
      const response = await fetch('/api/calendar/list-calendars')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load calendars')
      }

      setAvailableCalendars(data.calendars)
    } catch (error: any) {
      alert(error.message || 'Failed to load calendars')
      console.error('Error loading calendars:', error)
    } finally {
      setLoadingCalendars(false)
    }
  }

  const handleChangeCalendar = async () => {
    setShowCalendarPicker(true)
    await loadAvailableCalendars()
  }

  const handleSelectCalendar = async (calendarId: string, calendarName: string) => {
    if (!googleIntegration) return

    setSwitchingCalendar(true)
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .update({
          calendar_id: calendarId,
          calendar_name: calendarName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', googleIntegration.id)

      if (error) throw error

      setGoogleIntegration({
        ...googleIntegration,
        calendar_id: calendarId,
        calendar_name: calendarName,
      })

      setShowCalendarPicker(false)
      alert(`Successfully switched to calendar: ${calendarName}`)
    } catch (error: any) {
      alert(error.message || 'Failed to switch calendar')
      console.error('Error switching calendar:', error)
    } finally {
      setSwitchingCalendar(false)
    }
  }

  const handleConnectGoogle = async () => {
    setConnecting(true)
    try {
      // Call API to initiate OAuth flow
      const response = await fetch('/api/auth/google/initiate')
      const data = await response.json()

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to connect to Google Calendar')
      setConnecting(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google Calendar? This will stop syncing jobs to your calendar.')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setGoogleIntegration(null)
    } catch (error: any) {
      alert(error.message || 'Failed to disconnect Google Calendar')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleToggleTwoWaySync = async (enabled: boolean) => {
    if (!googleIntegration) return

    try {
      // If enabling two-way sync, start the watch channel first
      if (enabled) {
        const watchResponse = await fetch('/api/calendar/start-watch', {
          method: 'POST',
        })

        if (!watchResponse.ok) {
          const watchError = await watchResponse.json()
          throw new Error(watchError.error || 'Failed to start watch channel')
        }

        console.log('Watch channel started successfully')
      }

      // Update two-way sync setting
      const { error } = await supabase
        .from('google_calendar_integrations')
        .update({ two_way_sync_enabled: enabled })
        .eq('id', googleIntegration.id)

      if (error) throw error

      // Update local state
      setGoogleIntegration({
        ...googleIntegration,
        two_way_sync_enabled: enabled,
      })

      if (enabled) {
        alert('Two-way sync enabled! Changes in Google Calendar will now sync to the CRM.')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update two-way sync setting')
      console.error('Error toggling two-way sync:', error)
    }
  }

  const handleConnectGmail = async () => {
    setConnectingEmail('gmail')
    try {
      const response = await fetch('/api/integrations/gmail/auth')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to connect to Gmail')
      setConnectingEmail(null)
    }
  }

  const handleConnectOutlook = async () => {
    setConnectingEmail('outlook')
    try {
      const response = await fetch('/api/integrations/outlook/auth')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to connect to Outlook')
      setConnectingEmail(null)
    }
  }

  const handleDisconnectEmail = async (integrationId: string, provider: string) => {
    if (!confirm(`Disconnect ${provider} account? This will stop email syncing.`)) {
      return
    }

    setDisconnectingEmail(integrationId)
    try {
      const endpoint = provider.toLowerCase() === 'gmail'
        ? '/api/integrations/gmail/disconnect'
        : '/api/integrations/outlook/disconnect'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      // Reload email integrations
      await loadEmailIntegrations()
    } catch (error: any) {
      alert(error.message || 'Failed to disconnect email account')
    } finally {
      setDisconnectingEmail(null)
    }
  }

  const handleSyncEmail = async (integrationId: string, provider: string) => {
    setSyncingEmail(integrationId)
    try {
      const endpoint = provider.toLowerCase() === 'gmail'
        ? '/api/integrations/gmail/sync'
        : '/api/integrations/outlook/sync'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, maxResults: 50 }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync emails')
      }

      const result = await response.json()
      alert(`Successfully synced ${result.synced} of ${result.total} emails!${result.errors > 0 ? ` (${result.errors} errors)` : ''}`)

      // Reload email integrations to update last_sync_at
      await loadEmailIntegrations()
    } catch (error: any) {
      alert(error.message || 'Failed to sync emails')
      console.error('Error syncing emails:', error)
    } finally {
      setSyncingEmail(null)
    }
  }

  const handleConnectGmb = async () => {
    setConnectingGmb(true)
    try {
      const response = await fetch('/api/integrations/gmb/auth')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to connect to Google My Business')
      setConnectingGmb(false)
    }
  }

  const handleDisconnectGmb = async () => {
    if (!gmbIntegration) return

    if (!confirm('Disconnect Google My Business? This will stop syncing reviews.')) {
      return
    }

    setDisconnectingGmb(true)
    try {
      const response = await fetch('/api/integrations/gmb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: gmbIntegration.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setGmbIntegration(null)
    } catch (error: any) {
      alert(error.message || 'Failed to disconnect Google My Business')
    } finally {
      setDisconnectingGmb(false)
    }
  }

  const handleSyncGmb = async () => {
    if (!gmbIntegration) return

    setSyncingGmb(true)
    try {
      const response = await fetch('/api/integrations/gmb/sync-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: gmbIntegration.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync reviews')
      }

      const result = await response.json()
      alert(`Successfully synced ${result.synced} of ${result.total} reviews!${result.errors > 0 ? ` (${result.errors} errors)` : ''}`)

      // Reload GMB integration to update last_sync_at
      await loadGmbIntegration()
    } catch (error: any) {
      alert(error.message || 'Failed to sync reviews')
      console.error('Error syncing reviews:', error)
    } finally {
      setSyncingGmb(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>
                Two-way sync for job bookings
              </CardDescription>
            </div>
            {!googleIntegration && (
              <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {googleIntegration ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <div className="font-medium">
                  {googleIntegration ? 'Connected' : 'Not Connected'}
                </div>
                <p className="text-sm text-gray-500">
                  {googleIntegration
                    ? 'Jobs automatically sync to your Google Calendar'
                    : 'Connect to sync job bookings with Google Calendar'}
                </p>
              </div>
            </div>
            {googleIntegration ? (
              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConnectGoogle}
                disabled={connecting}
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>

          {googleIntegration && (
            <div className="mt-4 space-y-3">
              {/* Integration Status */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="font-medium text-green-900">
                      Account: {googleIntegration.email}
                    </div>
                    <div className="font-medium text-green-900 mt-1">
                      Calendar: {googleIntegration.calendar_name || googleIntegration.calendar_id}
                    </div>
                    <div className="text-green-700 mt-1">
                      Sync: {googleIntegration.sync_enabled ? 'Enabled' : 'Disabled'}
                      {googleIntegration.last_sync_at && (
                        <> • Last synced: {format(new Date(googleIntegration.last_sync_at), 'PPp')}</>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangeCalendar}
                    className="mt-2"
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Change Calendar
                  </Button>
                </div>
              </div>

              {/* Two-Way Sync Toggle */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="two-way-sync" className="font-medium text-blue-900 cursor-pointer">
                        Two-Way Sync
                      </Label>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      When enabled, changes made in Google Calendar (date/time, description) will sync back to the CRM.
                      CRM-specific data (pipeline, service, pricing, customer info) is always preserved.
                    </p>
                  </div>
                  <Switch
                    id="two-way-sync"
                    checked={googleIntegration.two_way_sync_enabled}
                    onCheckedChange={handleToggleTwoWaySync}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gmail Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Gmail
              </CardTitle>
              <CardDescription>
                Send and receive emails within the CRM
              </CardDescription>
            </div>
            {emailIntegrations.filter(i => i.provider === 'gmail').length === 0 && (
              <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmails ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {emailIntegrations.filter(i => i.provider === 'gmail').map((integration) => (
                <div key={integration.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium text-green-900">
                          {integration.display_name || integration.email_address}
                        </div>
                        <div className="text-sm text-green-700">
                          {integration.email_address}
                          {integration.last_sync_at && (
                            <> • Last synced: {format(new Date(integration.last_sync_at), 'PPp')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncEmail(integration.id, 'gmail')}
                        disabled={syncingEmail === integration.id}
                      >
                        {syncingEmail === integration.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Now'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectEmail(integration.id, 'Gmail')}
                        disabled={disconnectingEmail === integration.id}
                      >
                        {disconnectingEmail === integration.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {emailIntegrations.filter(i => i.provider === 'gmail').length === 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">Not Connected</div>
                      <p className="text-sm text-gray-500">
                        Connect Gmail to manage customer emails from the CRM
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectGmail}
                    disabled={connectingEmail === 'gmail'}
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    {connectingEmail === 'gmail' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlook/Office 365 Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Outlook / Office 365
              </CardTitle>
              <CardDescription>
                Send and receive emails within the CRM
              </CardDescription>
            </div>
            {emailIntegrations.filter(i => i.provider === 'outlook' || i.provider === 'office365').length === 0 && (
              <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmails ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {emailIntegrations.filter(i => i.provider === 'outlook' || i.provider === 'office365').map((integration) => (
                <div key={integration.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium text-green-900">
                          {integration.display_name || integration.email_address}
                        </div>
                        <div className="text-sm text-green-700">
                          {integration.email_address}
                          {integration.last_sync_at && (
                            <> • Last synced: {format(new Date(integration.last_sync_at), 'PPp')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncEmail(integration.id, 'outlook')}
                        disabled={syncingEmail === integration.id}
                      >
                        {syncingEmail === integration.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Now'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectEmail(integration.id, 'Outlook')}
                        disabled={disconnectingEmail === integration.id}
                      >
                        {disconnectingEmail === integration.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {emailIntegrations.filter(i => i.provider === 'outlook' || i.provider === 'office365').length === 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">Not Connected</div>
                      <p className="text-sm text-gray-500">
                        Connect Outlook to manage customer emails from the CRM
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectOutlook}
                    disabled={connectingEmail === 'outlook'}
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    {connectingEmail === 'outlook' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google My Business */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Google My Business
              </CardTitle>
              <CardDescription>
                Manage reviews and send automated review requests
              </CardDescription>
            </div>
            {!gmbIntegration && (
              <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingGmb ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {gmbIntegration ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium text-green-900">
                          {gmbIntegration.business_name || 'Connected'}
                        </div>
                        <div className="text-sm text-green-700">
                          {gmbIntegration.business_address || 'Business profile connected'}
                          {gmbIntegration.last_sync_at && (
                            <> • Last synced: {format(new Date(gmbIntegration.last_sync_at), 'PPp')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncGmb}
                        disabled={syncingGmb}
                      >
                        {syncingGmb ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Reviews'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectGmb}
                        disabled={disconnectingGmb}
                      >
                        {disconnectingGmb ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">Not Connected</div>
                      <p className="text-sm text-gray-500">
                        Connect to manage reviews and send automated review requests
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectGmb}
                    disabled={connectingGmb}
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    {connectingGmb ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Picker Dialog */}
      <Dialog open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select a Calendar</DialogTitle>
            <DialogDescription>
              Choose which Google Calendar to sync your CRM jobs with
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loadingCalendars ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              availableCalendars.map((calendar) => (
                <button
                  key={calendar.id}
                  onClick={() => handleSelectCalendar(calendar.id, calendar.summary)}
                  disabled={switchingCalendar}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: calendar.backgroundColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {calendar.summary}
                          {calendar.primary && (
                            <Badge className="ml-2 text-xs" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                              Primary
                            </Badge>
                          )}
                        </div>
                        {calendar.description && (
                          <p className="text-xs text-gray-500 truncate">{calendar.description}</p>
                        )}
                      </div>
                    </div>
                    {googleIntegration?.calendar_id === calendar.id && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { EmailSignatures } from './EmailSignatures'
import { Database } from '@/types/database'

type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']

interface EmailSettingsProps {
  emailIntegrations: EmailIntegration[]
}

export function EmailSettings({ emailIntegrations: initialIntegrations }: EmailSettingsProps) {
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegration[]>(initialIntegrations)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [connectingEmail, setConnectingEmail] = useState<'gmail' | 'outlook' | null>(null)
  const [disconnectingEmail, setDisconnectingEmail] = useState<string | null>(null)
  const [syncingEmail, setSyncingEmail] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for OAuth callback success/error
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'gmail_connected' || success === 'outlook_connected') {
      loadEmailIntegrations()
      router.replace('/settings?tab=email')
    }

    if (error) {
      alert(`Error: ${error}`)
      router.replace('/settings?tab=email')
    }
  }, [searchParams])

  const loadEmailIntegrations = async () => {
    setLoadingEmails(true)
    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
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

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">Email Accounts</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        {/* Email Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6 mt-6">
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
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="mt-0">
          <EmailSignatures emailIntegrations={emailIntegrations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

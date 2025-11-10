'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Webhook, Copy, Check, Eye, EyeOff } from 'lucide-react'

export function WebhookSettings() {
  const [sophieKey, setSophieKey] = useState('sk_sophie_live_xxxxxxxxxxxx')
  const [widgetKey, setWidgetKey] = useState('sk_widget_live_xxxxxxxxxxxx')
  const [showSophieKey, setShowSophieKey] = useState(false)
  const [showWidgetKey, setShowWidgetKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // In production, these would be environment variables
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const sophieWebhookUrl = `${baseUrl}/api/webhooks/sophie`
  const widgetWebhookUrl = `${baseUrl}/api/webhooks/widget`

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = () => {
    // TODO: Save API keys to database
    alert('Webhook settings saved! (Coming soon)')
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Sophie AI Webhook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Sophie AI Webhook
              </CardTitle>
              <CardDescription>
                Retell AI voice agent integration
              </CardDescription>
            </div>
            <Badge style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={sophieWebhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(sophieWebhookUrl, 'sophie-url')}
              >
                {copied === 'sophie-url' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure this URL in your Retell AI dashboard
            </p>
          </div>

          <div>
            <Label>API Key</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type={showSophieKey ? 'text' : 'password'}
                value={sophieKey}
                onChange={(e) => setSophieKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSophieKey(!showSophieKey)}
              >
                {showSophieKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Authentication key for Sophie webhook requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* VAPI Widget Webhook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Chat Widget Webhook
              </CardTitle>
              <CardDescription>
                VAPI chat widget integration
              </CardDescription>
            </div>
            <Badge style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={widgetWebhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(widgetWebhookUrl, 'widget-url')}
              >
                {copied === 'widget-url' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure this URL in your VAPI dashboard
            </p>
          </div>

          <div>
            <Label>API Key</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type={showWidgetKey ? 'text' : 'password'}
                value={widgetKey}
                onChange={(e) => setWidgetKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowWidgetKey(!showWidgetKey)}
              >
                {showWidgetKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Authentication key for widget webhook requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          style={{ backgroundColor: '#d52329' }}
          className="text-white hover:opacity-90"
        >
          Save Webhook Settings
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  FileSignature,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']
type EmailSignature = Database['public']['Tables']['email_signatures']['Row']

interface IntegrationStatusHeaderProps {
  emailIntegrations: EmailIntegration[]
  onSync?: () => void
  syncing?: boolean
}

export function IntegrationStatusHeader({
  emailIntegrations,
  onSync,
  syncing = false
}: IntegrationStatusHeaderProps) {
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [loadingSignatures, setLoadingSignatures] = useState(true)
  const gmailIntegration = emailIntegrations.find(i => i.provider === 'gmail' && i.is_active)

  const supabase = createClient()

  // Fetch signatures
  useEffect(() => {
    const fetchSignatures = async () => {
      setLoadingSignatures(true)
      try {
        const response = await fetch('/api/signatures')
        const data = await response.json()
        if (response.ok) {
          setSignatures(data.signatures || [])
        }
      } catch (error) {
        console.error('Error fetching signatures:', error)
      } finally {
        setLoadingSignatures(false)
      }
    }
    fetchSignatures()
  }, [])

  // Get signature for integration
  const getIntegrationSignature = (integration: EmailIntegration) => {
    // First, try to find a signature specifically for this integration
    const integrationSig = signatures.find(s => s.integration_id === integration.id)
    if (integrationSig) return integrationSig

    // Fall back to default signature
    const defaultSig = signatures.find(s => s.is_default)
    return defaultSig
  }

  // Handle signature selection for an integration
  const handleSignatureChange = async (integrationId: string, signatureId: string) => {
    try {
      // Update integration to use this signature
      const { error } = await supabase
        .from('email_integrations')
        .update({ default_signature_id: signatureId === 'none' ? null : signatureId })
        .eq('id', integrationId)

      if (error) {
        console.error('Failed to update integration signature:', error)
        alert('Failed to update signature')
      }
    } catch (err) {
      console.error('Exception updating signature:', err)
      alert('Failed to update signature')
    }
  }

  const hasSMS = false
  const hasWhatsApp = false

  return (
    <div className="bg-white border-b p-3 mb-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Connected Channels Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Gmail */}
          {gmailIntegration ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <Mail className="h-4 w-4 text-green-600" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-green-900">{gmailIntegration.email_address}</span>
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                </div>
                {gmailIntegration.last_sync_at && (
                  <span className="text-xs text-green-700">
                    {formatDistanceToNow(new Date(gmailIntegration.last_sync_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {/* Signature Selector */}
              {!loadingSignatures && signatures.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-green-300">
                  <FileSignature className="h-3.5 w-3.5 text-green-600" />
                  <Select
                    value={getIntegrationSignature(gmailIntegration)?.id || 'none'}
                    onValueChange={(value) => handleSignatureChange(gmailIntegration.id, value)}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-xs border-green-300">
                      <SelectValue placeholder="No signature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No signature</SelectItem>
                      {signatures.map((sig) => (
                        <SelectItem key={sig.id} value={sig.id}>
                          {sig.name} {sig.is_default && '(Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <Link href="/settings?tab=email">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Email</span>
                <XCircle className="h-3 w-3 text-gray-400" />
              </div>
            </Link>
          )}

          {/* SMS */}
          {!hasSMS && (
            <Link href="/settings?tab=integrations">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">SMS</span>
                <XCircle className="h-3 w-3 text-gray-400" />
              </div>
            </Link>
          )}

          {/* WhatsApp */}
          {!hasWhatsApp && (
            <Link href="/settings?tab=integrations">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">WhatsApp</span>
                <XCircle className="h-3 w-3 text-gray-400" />
              </div>
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {gmailIntegration && onSync && (
            <Button
              onClick={onSync}
              disabled={syncing}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
          <Link href="/settings?tab=email">
            <Button variant="outline" size="sm">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

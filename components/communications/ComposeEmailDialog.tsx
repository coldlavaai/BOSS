'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Mail, User, Plus, FileSignature } from 'lucide-react'
import { Database } from '@/types/database'

type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']
type EmailSignature = Database['public']['Tables']['email_signatures']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailIntegrations: EmailIntegration[]
  customers?: Customer[]
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  emailIntegrations,
  customers = [],
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
}: ComposeEmailDialogProps) {
  const router = useRouter()
  const [selectedIntegration, setSelectedIntegration] = useState<string>('')
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string>('default')
  const [loadingSignatures, setLoadingSignatures] = useState(false)

  // Fetch signatures when dialog opens
  useEffect(() => {
    if (open) {
      fetchSignatures()
    }
  }, [open])

  const fetchSignatures = async () => {
    setLoadingSignatures(true)
    try {
      const response = await fetch('/api/signatures')
      const data = await response.json()
      if (response.ok) {
        setSignatures(data.signatures || [])

        // Set default signature if one exists
        const defaultSig = data.signatures?.find((s: EmailSignature) => s.is_default)
        if (defaultSig) {
          setSelectedSignature(defaultSig.id)
        }
      }
    } catch (error) {
      console.error('Error fetching signatures:', error)
    } finally {
      setLoadingSignatures(false)
    }
  }

  // Set default integration when dialog opens
  useEffect(() => {
    if (open && emailIntegrations.length > 0 && !selectedIntegration) {
      // Prefer Gmail, fallback to first available
      const gmail = emailIntegrations.find(i => i.provider === 'gmail')
      setSelectedIntegration(gmail?.id || emailIntegrations[0].id)
    }
  }, [open, emailIntegrations, selectedIntegration])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTo(defaultTo)
      setCc('')
      setSubject(defaultSubject)
      setBody(defaultBody)
      setShowCc(false)
      setSelectedSignature('default')
    }
  }, [open, defaultTo, defaultSubject, defaultBody])

  // Get body with signature
  const getBodyWithSignature = () => {
    if (selectedSignature === 'none') {
      return body
    }

    const signature = signatures.find(s => s.id === selectedSignature)
    if (!signature) {
      return body
    }

    // Add signature with a separator
    return `${body}\n\n${signature.html_content}`
  }

  const handleSend = async () => {
    if (!selectedIntegration || !to || !subject || !body) {
      alert('Please fill in all required fields')
      return
    }

    setSending(true)
    try {
      const integration = emailIntegrations.find(i => i.id === selectedIntegration)
      if (!integration) {
        throw new Error('Integration not found')
      }

      const endpoint = integration.provider === 'gmail'
        ? '/api/integrations/gmail/send'
        : '/api/integrations/outlook/send'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: selectedIntegration,
          to: to.split(',').map(e => e.trim()),
          cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
          subject,
          body: getBodyWithSignature(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      alert('Email sent successfully!')
      onOpenChange(false)

      // Refresh data from server (instant, no full reload)
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to send email')
      console.error('Error sending email:', error)
    } finally {
      setSending(false)
    }
  }

  const handleSelectCustomer = (email: string) => {
    setTo(email)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email to a customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Select
              value={selectedIntegration}
              onValueChange={setSelectedIntegration}
            >
              <SelectTrigger id="from">
                <SelectValue placeholder="Select email account" />
              </SelectTrigger>
              <SelectContent>
                {emailIntegrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {integration.email_address}
                      {integration.display_name && (
                        <span className="text-xs text-gray-500">
                          ({integration.display_name})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selection (optional quick select) */}
          {customers.length > 0 && (
            <div className="space-y-2">
              <Label>Quick Select Customer</Label>
              <Select onValueChange={handleSelectCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter(c => c.email)
                    .map((customer) => (
                      <SelectItem key={customer.id} value={customer.email!}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {customer.name} - {customer.email}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To */}
          <div className="space-y-2">
            <Label htmlFor="to">
              To <span className="text-red-500">*</span>
            </Label>
            <Input
              id="to"
              type="email"
              placeholder="customer@example.com (comma-separated for multiple)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* Cc (optional) */}
          {!showCc ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowCc(true)}
              className="px-0"
            >
              + Add Cc
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                type="email"
                placeholder="cc@example.com (comma-separated for multiple)"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                disabled={sending}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="body"
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              rows={10}
              className="resize-none"
            />
          </div>

          {/* Signature Selector */}
          <div className="space-y-2">
            <Label htmlFor="signature">Signature</Label>
            {loadingSignatures ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading signatures...
              </div>
            ) : signatures.length === 0 ? (
              <div className="p-3 border rounded-md bg-amber-50 border-amber-200">
                <div className="flex items-start gap-2">
                  <FileSignature className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      No signatures yet
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      Create an email signature to automatically include your contact details and branding
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/settings?tab=email', '_blank')}
                      disabled={sending}
                      className="bg-white border-amber-300 hover:bg-amber-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create your first signature
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Select
                  value={selectedSignature}
                  onValueChange={setSelectedSignature}
                  disabled={sending}
                >
                  <SelectTrigger id="signature">
                    <SelectValue placeholder="Select signature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        No signature
                      </div>
                    </SelectItem>
                    {signatures.map((signature) => (
                      <SelectItem key={signature.id} value={signature.id}>
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          {signature.name}
                          {signature.is_default && (
                            <span className="text-xs text-muted-foreground">(Default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => window.open('/settings?tab=email', '_blank')}
                  className="px-0"
                  disabled={sending}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create new signature
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !to || !subject || !body}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

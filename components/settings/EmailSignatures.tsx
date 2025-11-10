'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail,
  Plus,
  Download,
  Edit2,
  Trash2,
  Star,
  StarOff,
  Loader2,
} from 'lucide-react'
import { Database } from '@/types/database'
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor'

type EmailSignature = Database['public']['Tables']['email_signatures']['Row']
type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']

interface EmailSignaturesProps {
  emailIntegrations: EmailIntegration[]
}

export function EmailSignatures({ emailIntegrations }: EmailSignaturesProps) {
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')

  useEffect(() => {
    fetchSignatures()
  }, [])

  const fetchSignatures = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/signatures')
      const data = await response.json()

      if (response.ok) {
        setSignatures(data.signatures || [])
      }
    } catch (error) {
      console.error('Error fetching signatures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportSignature = async (integrationId: string) => {
    setImporting(true)
    try {
      const response = await fetch('/api/signatures/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_id: integrationId }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchSignatures()
        alert('Signature imported successfully!')
      } else {
        alert(data.message || data.error || 'Failed to import signature')
      }
    } catch (error) {
      console.error('Error importing signature:', error)
      alert('Failed to import signature')
    } finally {
      setImporting(false)
    }
  }

  const handleCreateSignature = async () => {
    if (!name || !htmlContent) {
      alert('Name and HTML content are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          html_content: htmlContent,
          text_content: textContent || htmlContent.replace(/<[^>]*>/g, ''),
          is_default: false,
        }),
      })

      if (response.ok) {
        await fetchSignatures()
        setShowCreateDialog(false)
        setName('')
        setHtmlContent('')
        setTextContent('')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create signature')
      }
    } catch (error) {
      console.error('Error creating signature:', error)
      alert('Failed to create signature')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSignature = async () => {
    if (!editingSignature || !name || !htmlContent) {
      alert('Name and HTML content are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/signatures/${editingSignature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          html_content: htmlContent,
          text_content: textContent || htmlContent.replace(/<[^>]*>/g, ''),
        }),
      })

      if (response.ok) {
        await fetchSignatures()
        setShowEditDialog(false)
        setEditingSignature(null)
        setName('')
        setHtmlContent('')
        setTextContent('')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update signature')
      }
    } catch (error) {
      console.error('Error updating signature:', error)
      alert('Failed to update signature')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (signatureId: string, isDefault: boolean) => {
    try {
      const response = await fetch(`/api/signatures/${signatureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: isDefault }),
      })

      if (response.ok) {
        await fetchSignatures()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to set default signature')
      }
    } catch (error) {
      console.error('Error setting default signature:', error)
      alert('Failed to set default signature')
    }
  }

  const handleDelete = async (signatureId: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) {
      return
    }

    try {
      const response = await fetch(`/api/signatures/${signatureId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchSignatures()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete signature')
      }
    } catch (error) {
      console.error('Error deleting signature:', error)
      alert('Failed to delete signature')
    }
  }

  const openEditDialog = (signature: EmailSignature) => {
    setEditingSignature(signature)
    setName(signature.name)
    setHtmlContent(signature.html_content)
    setTextContent(signature.text_content || '')
    setShowEditDialog(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Signatures
          </CardTitle>
          <CardDescription>
            Manage your email signatures for automated emails and manual sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Import signatures from your connected email accounts or create custom ones
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Signature
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import from Email Accounts */}
      {emailIntegrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import from Email Accounts</CardTitle>
            <CardDescription>
              Import signatures from your connected Gmail or Outlook accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emailIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{integration.email_address}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {integration.provider}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleImportSignature(integration.id)}
                    disabled={importing}
                    variant="outline"
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Import Signature
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signatures List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Signatures</CardTitle>
          <CardDescription>
            {signatures.length} signature{signatures.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signatures.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No signatures yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Import from your email account or create a custom signature
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {signatures.map((signature) => (
                <div
                  key={signature.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{signature.name}</h3>
                        {signature.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {signature.source}
                        </Badge>
                      </div>
                      <div
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: signature.html_content }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleSetDefault(signature.id, !signature.is_default)
                        }
                        title={signature.is_default ? 'Remove as default' : 'Set as default'}
                      >
                        {signature.is_default ? (
                          <StarOff className="h-4 w-4" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(signature)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(signature.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Signature Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Signature</DialogTitle>
            <DialogDescription>
              Create a custom email signature for your automated and manual emails
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Signature Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Professional Signature"
              />
            </div>
            <div>
              <Label htmlFor="html">Signature Content</Label>
              <WysiwygEditor
                value={htmlContent}
                onChange={setHtmlContent}
                placeholder="Best regards,&#10;Your Name"
              />
            </div>
            <div>
              <Label htmlFor="text">Plain Text (Optional)</Label>
              <Textarea
                id="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Best regards,&#10;Your Name"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated from HTML if left empty
              </p>
            </div>
            {htmlContent && (
              <div>
                <Label>Preview</Label>
                <div
                  className="border rounded-lg p-4 bg-muted/50"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSignature}
              disabled={saving || !name || !htmlContent}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Signature Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Signature</DialogTitle>
            <DialogDescription>
              Update your email signature content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Signature Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Professional Signature"
              />
            </div>
            <div>
              <Label htmlFor="edit-html">Signature Content</Label>
              <WysiwygEditor
                value={htmlContent}
                onChange={setHtmlContent}
                placeholder="Best regards,&#10;Your Name"
              />
            </div>
            <div>
              <Label htmlFor="edit-text">Plain Text (Optional)</Label>
              <Textarea
                id="edit-text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Best regards,&#10;Your Name"
                rows={4}
              />
            </div>
            {htmlContent && (
              <div>
                <Label>Preview</Label>
                <div
                  className="border rounded-lg p-4 bg-muted/50"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setEditingSignature(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSignature}
              disabled={saving || !name || !htmlContent}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

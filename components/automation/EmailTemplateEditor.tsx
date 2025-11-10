'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, Save, X, Loader2, FileText, Eye, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WysiwygEditor, WysiwygEditorRef } from '@/components/ui/wysiwyg-editor'
import { VariablePicker } from '@/components/email-templates/VariablePicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type EmailTemplate = Database['public']['Tables']['email_templates']['Row']

interface EditingTemplate extends Partial<EmailTemplate> {
  isNew?: boolean
}

export function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [variablePickerOpen, setVariablePickerOpen] = useState(false)
  const [variableTarget, setVariableTarget] = useState<'subject' | 'body'>('body')
  const bodyEditorRef = useRef<WysiwygEditorRef>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingTemplate({
      isNew: true,
      name: '',
      template_type: 'custom',
      subject_template: '',
      body_html: '',
      is_active: true,
    })
    setError(null)
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template, isNew: false })
    setError(null)
  }

  const handleCancel = () => {
    setEditingTemplate(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editingTemplate) return

    if (!editingTemplate.name?.trim()) {
      setError('Template name is required')
      return
    }

    if (!editingTemplate.subject_template?.trim()) {
      setError('Email subject is required')
      return
    }

    if (!editingTemplate.body_html?.trim()) {
      setError('Email body is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to save templates')
        return
      }

      if (editingTemplate.isNew) {
        // Create new template
        const { error: createError } = await supabase
          .from('email_templates')
          .insert({
            user_id: user.id,
            name: editingTemplate.name.trim(),
            template_type: editingTemplate.template_type || 'custom',
            subject_template: editingTemplate.subject_template.trim(),
            body_html: editingTemplate.body_html,
            is_active: editingTemplate.is_active ?? true,
          })

        if (createError) throw createError
      } else {
        // Update existing template
        const { error: updateError } = await supabase
          .from('email_templates')
          .update({
            name: editingTemplate.name.trim(),
            template_type: editingTemplate.template_type || 'custom',
            subject_template: editingTemplate.subject_template.trim(),
            body_html: editingTemplate.body_html,
            is_active: editingTemplate.is_active ?? true,
          })
          .eq('id', editingTemplate.id!)

        if (updateError) throw updateError
      }

      await fetchTemplates()
      setEditingTemplate(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      await fetchTemplates()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  const handleVariableInsert = (variable: string) => {
    if (!editingTemplate) return

    if (variableTarget === 'subject') {
      const currentSubject = editingTemplate.subject_template || ''
      setEditingTemplate({
        ...editingTemplate,
        subject_template: currentSubject + variable,
      })
    } else {
      // For body, use the editor's insertContent method to insert directly into DOM
      // This prevents React DOM conflicts
      if (bodyEditorRef.current) {
        bodyEditorRef.current.insertContent(variable)
      }
    }
    setVariablePickerOpen(false)
  }

  const openVariablePicker = (target: 'subject' | 'body') => {
    setVariableTarget(target)
    setVariablePickerOpen(true)
  }

  const handlePreview = () => {
    setPreviewOpen(true)
  }

  const renderPreview = () => {
    if (!editingTemplate) return ''

    // Simple preview - replace variables with example data
    let preview = editingTemplate.body_html || ''

    // Replace common variables with sample data for preview
    const sampleData: Record<string, string> = {
      '{{customer.name}}': 'John Smith',
      '{{customer.email}}': 'john@example.com',
      '{{customer.phone}}': '+44 7700 900000',
      '{{job.booking_date}}': '2025-11-15',
      '{{job.booking_time}}': '10:00 AM',
      '{{service.name}}': 'Premium Detail',
      '{{service.duration}}': '3 hours',
      '{{vehicle.make}}': 'BMW',
      '{{vehicle.model}}': '3 Series',
      '{{vehicle.registration}}': 'AB12 CDE',
    }

    Object.entries(sampleData).forEach(([variable, value]) => {
      preview = preview.replace(new RegExp(variable, 'g'), value)
    })

    return preview
  }

  return (
    <div className="space-y-6">
      {/* Create New Button */}
      {!editingTemplate && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Email Templates</h2>
            <p className="text-sm text-gray-600">
              Create reusable email templates with dynamic variables
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {/* Create/Edit Form */}
      {editingTemplate && (
        <Card className="border-2" style={{ borderColor: '#d52329' }}>
          <CardHeader>
            <CardTitle>
              {editingTemplate.isNew ? 'Create New Template' : 'Edit Template'}
            </CardTitle>
            <CardDescription>
              Use variables like {'{{customer.name}}'} to personalize your emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Name */}
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={editingTemplate.name || ''}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
                disabled={saving}
                placeholder="e.g. Booking Confirmation"
              />
              <p className="text-xs text-gray-500 mt-1">
                Internal name to identify this template
              </p>
            </div>

            {/* Email Subject with Variable Picker */}
            <div>
              <Label htmlFor="template-subject">Email Subject *</Label>
              <div className="flex gap-2">
                <Input
                  id="template-subject"
                  value={editingTemplate.subject_template || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject_template: e.target.value })
                  }
                  disabled={saving}
                  placeholder="e.g. Booking Confirmation for {{customer.name}}"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openVariablePicker('subject')}
                  disabled={saving}
                >
                  + Variable
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The subject line of your email (variables will be replaced)
              </p>
            </div>

            {/* Email Body with WYSIWYG Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Email Body *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openVariablePicker('body')}
                  disabled={saving}
                >
                  + Insert Variable
                </Button>
              </div>
              <WysiwygEditor
                ref={bodyEditorRef}
                value={editingTemplate.body_html || ''}
                onChange={(html) =>
                  setEditingTemplate({ ...editingTemplate, body_html: html })
                }
                placeholder="Type your email content here. Use the variable picker to insert dynamic fields."
                className="min-h-[300px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Compose your email with formatting. Variables will be replaced with actual data when sent.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="template-active"
                checked={editingTemplate.is_active ?? true}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })
                }
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="template-active" className="cursor-pointer">
                Active (available for use)
              </Label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={saving}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: '#d52329' }}
                  className="text-white hover:opacity-90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {!editingTemplate && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No templates yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first email template to get started
                </p>
                <Button
                  onClick={handleCreateNew}
                  style={{ backgroundColor: '#d52329' }}
                  className="text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{template.name}</h4>
                        {!template.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Subject:</strong> {template.subject_template}
                      </p>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(template.created_at!).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        disabled={saving || deleting}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        disabled={saving || deleting}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data (variables will be replaced with real data when sent)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Subject:</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                {editingTemplate?.subject_template || ''}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Body:</Label>
              <div
                className="mt-1 p-4 bg-white rounded-md border prose max-w-none"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variable Picker Dialog */}
      <VariablePicker
        open={variablePickerOpen}
        onOpenChange={setVariablePickerOpen}
        onVariableSelect={handleVariableInsert}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Trash2, Save, X, Loader2, Workflow, Power, PowerOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AutomationRule = Database['public']['Tables']['email_automation_rules']['Row']
type EmailTemplate = Database['public']['Tables']['email_templates']['Row']

interface EditingRule extends Partial<AutomationRule> {
  isNew?: boolean
}

const TRIGGER_TYPES = [
  { value: 'new_booking', label: 'New Booking Created', description: 'When a new job is booked' },
  { value: 'booking_confirmed', label: 'Booking Confirmed', description: 'When a booking is confirmed' },
  { value: 'booking_completed', label: 'Booking Completed', description: 'When a job is marked as complete' },
  { value: 'booking_cancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled' },
]

export function AutomationRulesManager() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('email_automation_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (rulesError) throw rulesError
      setRules(rulesData || [])

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (templatesError) throw templatesError
      setTemplates(templatesData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingRule({
      isNew: true,
      trigger_type: 'new_booking',
      template_id: '',
      send_to_customer: true,
      is_active: true,
    })
    setError(null)
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule({ ...rule, isNew: false })
    setError(null)
  }

  const handleCancel = () => {
    setEditingRule(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editingRule) return

    if (!editingRule.template_id) {
      setError('Please select an email template')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to save automation rules')
        return
      }

      if (editingRule.isNew) {
        // Create new rule - generate name from trigger type and template
        const triggerLabel = TRIGGER_TYPES.find(t => t.value === editingRule.trigger_type)?.label || editingRule.trigger_type
        const template = templates.find(t => t.id === editingRule.template_id)
        const ruleName = `${triggerLabel} - ${template?.name || 'Unknown Template'}`

        const { error: createError } = await supabase
          .from('email_automation_rules')
          .insert({
            user_id: user.id,
            name: ruleName,
            trigger_type: editingRule.trigger_type!,
            template_id: editingRule.template_id,
            send_to_customer: editingRule.send_to_customer ?? true,
            is_active: editingRule.is_active ?? true,
          })

        if (createError) throw createError
      } else {
        // Update existing rule - regenerate name
        const triggerLabel = TRIGGER_TYPES.find(t => t.value === editingRule.trigger_type)?.label || editingRule.trigger_type
        const template = templates.find(t => t.id === editingRule.template_id)
        const ruleName = `${triggerLabel} - ${template?.name || 'Unknown Template'}`

        const { error: updateError } = await supabase
          .from('email_automation_rules')
          .update({
            name: ruleName,
            trigger_type: editingRule.trigger_type!,
            template_id: editingRule.template_id,
            send_to_customer: editingRule.send_to_customer ?? true,
            is_active: editingRule.is_active ?? true,
          })
          .eq('id', editingRule.id!)

        if (updateError) throw updateError
      }

      await fetchData()
      setEditingRule(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save automation rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('email_automation_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      await fetchData()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete automation rule')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const { error } = await supabase
        .from('email_automation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)

      if (error) throw error

      await fetchData()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update automation rule')
    }
  }

  const getTriggerLabel = (triggerType: string) => {
    return TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType
  }

  const getTemplateById = (templateId: string) => {
    return templates.find(t => t.id === templateId)
  }

  return (
    <div className="space-y-6">
      {/* Create New Button */}
      {!editingRule && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Automation Rules</h2>
            <p className="text-sm text-gray-600">
              Automatically send emails when events occur
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            disabled={templates.length === 0}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      )}

      {/* Info Banner */}
      {templates.length === 0 && !editingRule && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              You need to create at least one email template before you can set up automation rules.
              Go to the <strong>Email Templates</strong> tab first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {editingRule && (
        <Card className="border-2" style={{ borderColor: '#d52329' }}>
          <CardHeader>
            <CardTitle>
              {editingRule.isNew ? 'Create Automation Rule' : 'Edit Automation Rule'}
            </CardTitle>
            <CardDescription>
              Configure when and what emails are automatically sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trigger Type */}
            <div>
              <Label htmlFor="trigger-type">When should this automation run? *</Label>
              <Select
                value={editingRule.trigger_type}
                onValueChange={(value) =>
                  setEditingRule({ ...editingRule, trigger_type: value as any })
                }
                disabled={saving}
              >
                <SelectTrigger id="trigger-type" className="mt-1">
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div>
                        <div className="font-medium">{trigger.label}</div>
                        <div className="text-xs text-gray-500">{trigger.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Which email template should be sent? *</Label>
              <Select
                value={editingRule.template_id}
                onValueChange={(value) =>
                  setEditingRule({ ...editingRule, template_id: value })
                }
                disabled={saving}
              >
                <SelectTrigger id="template" className="mt-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-md">
                          {template.subject_template}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Send to Customer Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send-to-customer"
                checked={editingRule.send_to_customer ?? true}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, send_to_customer: e.target.checked })
                }
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="send-to-customer" className="cursor-pointer">
                Send email to customer
              </Label>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rule-active"
                checked={editingRule.is_active ?? true}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, is_active: e.target.checked })
                }
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="rule-active" className="cursor-pointer">
                Active (enable this automation rule)
              </Label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
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
                    Save Rule
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {!editingRule && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Workflow className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No automation rules yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first automation rule to get started
                </p>
                {templates.length > 0 && (
                  <Button
                    onClick={handleCreateNew}
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => {
              const template = getTemplateById(rule.template_id)
              return (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">
                            {getTriggerLabel(rule.trigger_type)}
                          </h4>
                          {!rule.is_active ? (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                              <PowerOff className="h-3 w-3" />
                              Inactive
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                              <Power className="h-3 w-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <strong>Template:</strong> {template?.name || 'Unknown template'}
                          </p>
                          {template && (
                            <p className="text-xs text-gray-500">
                              Subject: {template.subject_template}
                            </p>
                          )}
                          <p>
                            <strong>Send to:</strong>{' '}
                            {rule.send_to_customer ? 'Customer' : 'No recipient'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Created: {new Date(rule.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(rule)}
                          disabled={saving || deleting}
                          title={rule.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {rule.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                          disabled={saving || deleting}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          disabled={saving || deleting}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

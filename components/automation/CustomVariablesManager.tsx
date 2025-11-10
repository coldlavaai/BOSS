'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Plus, Edit2, Trash2, Save, X, Loader2, Variable, Code2, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

type CustomVariable = Database['public']['Tables']['custom_variables']['Row']

interface EditingVariable extends Partial<CustomVariable> {
  isNew?: boolean
}

const DATA_TYPES = [
  { value: 'text', label: 'Text', description: 'Plain text value' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'date', label: 'Date', description: 'Date value (YYYY-MM-DD)' },
  { value: 'currency', label: 'Currency', description: 'Monetary value (£)' },
  { value: 'boolean', label: 'Yes/No', description: 'True or false value' },
]

export function CustomVariablesManager() {
  const [variables, setVariables] = useState<CustomVariable[]>([])
  const [editingVariable, setEditingVariable] = useState<EditingVariable | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchVariables()
  }, [])

  const fetchVariables = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('custom_variables')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error
      setVariables(data || [])
    } catch (err) {
      console.error('Error fetching custom variables:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingVariable({
      isNew: true,
      key: '',
      label: '',
      description: '',
      data_type: 'text',
      default_value: '',
      is_active: true,
    })
    setError(null)
  }

  const handleEdit = (variable: CustomVariable) => {
    setEditingVariable({ ...variable, isNew: false })
    setError(null)
  }

  const handleCancel = () => {
    setEditingVariable(null)
    setError(null)
  }

  const validateVariableKey = (key: string): string | null => {
    if (!key.trim()) {
      return 'Variable key is required'
    }

    // Must be lowercase letters, numbers, underscores only
    if (!/^[a-z0-9_]+$/.test(key)) {
      return 'Variable key must contain only lowercase letters, numbers, and underscores'
    }

    // Must start with a letter
    if (!/^[a-z]/.test(key)) {
      return 'Variable key must start with a letter'
    }

    // Check for duplicates
    if (editingVariable?.isNew) {
      const exists = variables.some(v => v.key === key)
      if (exists) {
        return 'A variable with this key already exists'
      }
    }

    return null
  }

  const handleSave = async () => {
    if (!editingVariable) return

    const keyError = validateVariableKey(editingVariable.key || '')
    if (keyError) {
      setError(keyError)
      return
    }

    if (!editingVariable.label?.trim()) {
      setError('Display name is required')
      return
    }

    if (!editingVariable.data_type) {
      setError('Data type is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingVariable.isNew) {
        // Create new variable
        const { error: createError } = await supabase
          .from('custom_variables')
          .insert({
            key: editingVariable.key!.trim().toLowerCase(),
            label: editingVariable.label.trim(),
            description: editingVariable.description?.trim() || null,
            data_type: editingVariable.data_type,
            default_value: editingVariable.default_value?.trim() || null,
            is_active: editingVariable.is_active ?? true,
          })

        if (createError) throw createError
      } else {
        // Update existing variable
        const { error: updateError } = await supabase
          .from('custom_variables')
          .update({
            label: editingVariable.label.trim(),
            description: editingVariable.description?.trim() || null,
            data_type: editingVariable.data_type,
            default_value: editingVariable.default_value?.trim() || null,
            is_active: editingVariable.is_active ?? true,
          })
          .eq('id', editingVariable.id!)

        if (updateError) throw updateError
      }

      await fetchVariables()
      setEditingVariable(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save variable')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (variableId: string) => {
    if (!confirm('Are you sure you want to delete this custom variable? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('custom_variables')
        .delete()
        .eq('id', variableId)

      if (error) throw error

      await fetchVariables()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete variable')
    } finally {
      setDeleting(false)
    }
  }

  const copyVariableKey = (variableKey: string) => {
    const fullVariable = `{{custom.${variableKey}}}`
    navigator.clipboard.writeText(fullVariable)
    setCopiedKey(variableKey)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getDataTypeIcon = (type: string) => {
    const typeConfig = DATA_TYPES.find(t => t.value === type)
    return typeConfig?.label || type
  }

  return (
    <div className="space-y-6">
      {/* Create New Button */}
      {!editingVariable && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Custom Variables</h2>
            <p className="text-sm text-gray-600">
              Define your own variables to use in email templates and automation
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Variable
          </Button>
        </div>
      )}

      {/* Info Card about Variables */}
      {!editingVariable && variables.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Variable className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">What are custom variables?</h3>
                <p className="text-sm text-blue-800">
                  Custom variables allow you to create your own dynamic fields beyond the standard customer, job, and service variables.
                  For example, you could create a "warranty_period" variable, "next_service_date", or "technician_name".
                </p>
                <p className="text-sm text-blue-800">
                  Once created, you can use them in your email templates just like standard variables: <code className="bg-blue-100 px-1 rounded">{'{{custom.your_variable}}'}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {editingVariable && (
        <Card className="border-2" style={{ borderColor: '#d52329' }}>
          <CardHeader>
            <CardTitle>
              {editingVariable.isNew ? 'Create Custom Variable' : 'Edit Custom Variable'}
            </CardTitle>
            <CardDescription>
              {editingVariable.isNew
                ? 'Define a new custom variable for use in templates'
                : 'Update the custom variable details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Variable Key */}
            <div>
              <Label htmlFor="variable-key">Variable Key *</Label>
              <Input
                id="variable-key"
                value={editingVariable.key || ''}
                onChange={(e) =>
                  setEditingVariable({
                    ...editingVariable,
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                  })
                }
                disabled={saving || !editingVariable.isNew}
                placeholder="e.g. warranty_period"
              />
              <div className="flex items-start gap-2 mt-2">
                <Code2 className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  {editingVariable.isNew ? (
                    <>
                      Use lowercase letters, numbers, and underscores only. Must start with a letter.
                      Will be used as: <code className="bg-gray-100 px-1 rounded">
                        {'{{custom.'}{editingVariable.key || 'your_key'}{'}}'}
                      </code>
                    </>
                  ) : (
                    <>Variable key cannot be changed after creation</>
                  )}
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="display-name">Display Name *</Label>
              <Input
                id="display-name"
                value={editingVariable.label || ''}
                onChange={(e) =>
                  setEditingVariable({ ...editingVariable, label: e.target.value })
                }
                disabled={saving}
                placeholder="e.g. Warranty Period"
              />
              <p className="text-xs text-gray-500 mt-1">
                Friendly name shown in the variable picker
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingVariable.description || ''}
                onChange={(e) =>
                  setEditingVariable({ ...editingVariable, description: e.target.value })
                }
                disabled={saving}
                placeholder="Describe what this variable represents"
                rows={2}
              />
            </div>

            {/* Data Type */}
            <div>
              <Label htmlFor="data-type">Data Type *</Label>
              <Select
                value={editingVariable.data_type || 'text'}
                onValueChange={(value) =>
                  setEditingVariable({ ...editingVariable, data_type: value })
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-gray-500">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                The type of data this variable will hold
              </p>
            </div>

            {/* Default Value */}
            <div>
              <Label htmlFor="default-value">Default Value</Label>
              <Input
                id="default-value"
                value={editingVariable.default_value || ''}
                onChange={(e) =>
                  setEditingVariable({ ...editingVariable, default_value: e.target.value })
                }
                disabled={saving}
                placeholder="Optional default value"
              />
              <p className="text-xs text-gray-500 mt-1">
                Value to use when no specific value is set
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="variable-active"
                checked={editingVariable.is_active ?? true}
                onChange={(e) =>
                  setEditingVariable({ ...editingVariable, is_active: e.target.checked })
                }
                disabled={saving}
                className="w-4 h-4"
              />
              <Label htmlFor="variable-active" className="cursor-pointer">
                Active (available for use in templates)
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
                    Save Variable
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables List */}
      {!editingVariable && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : variables.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Variable className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No custom variables yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first custom variable to extend your templates
                </p>
                <Button
                  onClick={handleCreateNew}
                  style={{ backgroundColor: '#d52329' }}
                  className="text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Variable
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variables.map((variable) => (
                <Card key={variable.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{variable.label}</h4>
                            {!variable.is_active && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          {variable.description && (
                            <p className="text-xs text-gray-600">{variable.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(variable)}
                            disabled={saving || deleting}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(variable.id)}
                            disabled={saving || deleting}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Variable Info */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium">{getDataTypeIcon(variable.data_type)}</span>
                        </div>
                        {variable.default_value && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Default:</span>
                            <span className="font-mono text-gray-700">{variable.default_value}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                            {'{{custom.'}{variable.key}{'}}'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyVariableKey(variable.key)}
                            className="flex-shrink-0"
                          >
                            {copiedKey === variable.key ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

type ServiceCategory = Database['public']['Tables']['service_categories']['Row']

interface CategoryManagementDialogProps {
  open: boolean
  onClose: () => void
}

interface EditingCategory extends Partial<ServiceCategory> {
  isNew?: boolean
}

export function CategoryManagementDialog({ open, onClose }: CategoryManagementDialogProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingCategory({
      isNew: true,
      name: '',
      description: '',
      display_order: categories.length,
      active: true,
    })
    setError(null)
  }

  const handleEdit = (category: ServiceCategory) => {
    setEditingCategory({ ...category, isNew: false })
    setError(null)
  }

  const handleCancel = () => {
    setEditingCategory(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editingCategory) return

    if (!editingCategory.name?.trim()) {
      setError('Category name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingCategory.isNew) {
        // Create new category
        const { error: createError } = await supabase
          .from('service_categories')
          .insert({
            name: editingCategory.name.trim(),
            description: editingCategory.description?.trim() || null,
            display_order: editingCategory.display_order || 0,
            active: editingCategory.active ?? true,
          })

        if (createError) throw createError
      } else {
        // Update existing category
        const { error: updateError } = await supabase
          .from('service_categories')
          .update({
            name: editingCategory.name.trim(),
            description: editingCategory.description?.trim() || null,
            display_order: editingCategory.display_order || 0,
            active: editingCategory.active ?? true,
          })
          .eq('id', editingCategory.id!)

        if (updateError) throw updateError
      }

      await fetchCategories()
      setEditingCategory(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Services in this category will need to be reassigned.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', categoryId)

      if (error) {
        if (error.code === '23503') {
          // Foreign key constraint
          setError('Cannot delete category. Please move or delete all services in this category first.')
        } else {
          throw error
        }
        return
      }

      await fetchCategories()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Service Categories</DialogTitle>
          <DialogDescription>
            Create, edit, and organize your service categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create New Button */}
          {!editingCategory && (
            <Button
              onClick={handleCreateNew}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Category
            </Button>
          )}

          {/* Create/Edit Form */}
          {editingCategory && (
            <Card className="border-2" style={{ borderColor: '#d52329' }}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {editingCategory.isNew ? 'Create New Category' : 'Edit Category'}
                  </h3>
                </div>

                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={editingCategory.name || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    disabled={saving}
                    placeholder="e.g. Detailing Services"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingCategory.description || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    disabled={saving}
                    placeholder="Brief description of this category"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="display-order">Display Order</Label>
                  <Input
                    id="display-order"
                    type="number"
                    min="0"
                    value={editingCategory.display_order || 0}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editingCategory.active ?? true}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, active: e.target.checked })
                    }
                    disabled={saving}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Active (visible in catalog)
                  </Label>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

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
                        Save Category
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">
                Existing Categories ({categories.length})
              </h3>
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No categories yet. Create one to get started!
                </p>
              ) : (
                categories.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{category.name}</h4>
                            {!category.active && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              Order: {category.display_order}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            disabled={saving || deleting || !!editingCategory}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            disabled={saving || deleting || !!editingCategory}
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
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

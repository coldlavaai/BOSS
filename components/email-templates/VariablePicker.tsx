'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Briefcase,
  Wrench,
  Building,
  Settings,
  Plus,
  Search,
  Copy,
  Check,
} from 'lucide-react'
import {
  STANDARD_VARIABLES,
  VARIABLE_CATEGORIES,
  VariableDefinition,
  formatVariableForTemplate,
  getVariablesByCategory,
} from '@/lib/email-templates/variables'

interface VariablePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVariableSelect: (variable: string) => void
  customVariables?: Array<{
    key: string
    label: string
    description: string
    dataType: string
  }>
}

const CATEGORY_ICONS: Record<string, any> = {
  customer: User,
  job: Briefcase,
  service: Wrench,
  company: Building,
  system: Settings,
  custom: Plus,
}

export function VariablePicker({
  open,
  onOpenChange,
  onVariableSelect,
  customVariables = [],
}: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)

  // Combine standard and custom variables
  const allVariables: VariableDefinition[] = [
    ...STANDARD_VARIABLES,
    ...customVariables.map(v => ({
      key: `custom.${v.key}`,
      label: v.label,
      description: v.description,
      category: 'custom' as const,
      example: `Custom: ${v.label}`,
      dataType: v.dataType as any,
    })),
  ]

  // Filter variables based on search and category
  const filteredVariables = allVariables.filter(variable => {
    const matchesSearch =
      !searchQuery ||
      variable.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variable.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || variable.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const categorizedVariables = Object.keys(VARIABLE_CATEGORIES).reduce(
    (acc, category) => {
      const vars = filteredVariables.filter(v => v.category === category)
      if (vars.length > 0) {
        acc[category] = vars
      }
      return acc
    },
    {} as Record<string, VariableDefinition[]>
  )

  const handleVariableClick = (variable: VariableDefinition) => {
    const formatted = formatVariableForTemplate(variable.key)
    onVariableSelect(formatted)

    // Show copied feedback
    setCopiedVariable(variable.key)
    setTimeout(() => setCopiedVariable(null), 2000)
  }

  const handleCopyVariable = (e: React.MouseEvent, variable: VariableDefinition) => {
    e.stopPropagation()
    const formatted = formatVariableForTemplate(variable.key)
    navigator.clipboard.writeText(formatted)

    setCopiedVariable(variable.key)
    setTimeout(() => setCopiedVariable(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert Variable</DialogTitle>
          <DialogDescription>
            Select a variable to insert into your template. Variables will be replaced with actual values when the email is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {Object.entries(VARIABLE_CATEGORIES).map(([key, category]) => {
              const Icon = CATEGORY_ICONS[key]
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* Variables List */}
          <div className="flex-1 border rounded-lg overflow-y-auto">
            <div className="p-4 space-y-6">
              {Object.keys(categorizedVariables).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No variables found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                Object.entries(categorizedVariables).map(([category, variables]) => {
                  const categoryInfo = VARIABLE_CATEGORIES[category]
                  const Icon = CATEGORY_ICONS[category]

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        {Icon && <Icon className="h-4 w-4 text-gray-600" />}
                        <h3 className="font-semibold text-sm">{categoryInfo.label}</h3>
                        <span className="text-xs text-gray-500">({variables.length})</span>
                      </div>

                      <div className="space-y-2">
                        {variables.map((variable) => (
                          <button
                            key={variable.key}
                            onClick={() => handleVariableClick(variable)}
                            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{variable.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {variable.dataType}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{variable.description}</p>
                                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {formatVariableForTemplate(variable.key)}
                                </code>
                                <p className="text-xs text-gray-500 mt-1">
                                  Example: <span className="font-medium">{variable.example}</span>
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleCopyVariable(e, variable)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copiedVariable === variable.key ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
            <strong>Tip:</strong> Click on a variable to insert it at your cursor position. Variables use the format{' '}
            <code className="bg-white px-1 py-0.5 rounded">{'{{variable.name}}'}</code> and will be automatically
            replaced with actual values when the email is sent.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

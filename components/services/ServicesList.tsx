'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Search, X, FolderEdit } from 'lucide-react'
import { EditServiceDialog } from './EditServiceDialog'
import { CreateServiceDialog } from './CreateServiceDialog'
import { CategoryManagementDialog } from './CategoryManagementDialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

type Service = Database['public']['Tables']['services']['Row'] & {
  category: Database['public']['Tables']['service_categories']['Row']
  pricing?: Array<{
    vehicle_size: string
    price_excl_vat: number
    price_incl_vat: number
  }>
}
type ServiceCategory = Database['public']['Tables']['service_categories']['Row']

interface ServicesListProps {
  initialServices: Service[]
  initialCategories: ServiceCategory[]
}

export function ServicesList({ initialServices, initialCategories }: ServicesListProps) {
  const [services] = useState(initialServices)
  const [categories] = useState(initialCategories)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const formatPrice = (pence: number) => {
    if (!pence || pence === 0) return 'Bespoke'
    return `£${(pence / 100).toFixed(0)}`
  }

  const getPriceForSize = (service: Service, size: string) => {
    if (!service.pricing || service.pricing.length === 0) return 0
    const priceEntry = service.pricing.find(p => p.vehicle_size === size)
    return priceEntry?.price_incl_vat || 0
  }

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    let filtered = services

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategoryId) {
      filtered = filtered.filter((service) => service.category_id === selectedCategoryId)
    }

    return filtered
  }, [services, searchQuery, selectedCategoryId])

  const getServicesForCategory = (categoryId: string) => {
    return filteredServices.filter((s) => s.category_id === categoryId)
  }

  const getCategoryCount = (categoryId: string) => {
    return services.filter((s) => s.category_id === categoryId).length
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategoryId(null)
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete service')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 lg:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold truncate" style={{ color: '#32373c' }}>
            Services
          </h1>
          <p className="text-xs lg:text-sm text-gray-600 mt-1 hidden sm:block">
            Manage your service catalog
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryDialog(true)}
            className="hidden sm:flex"
          >
            <FolderEdit className="h-4 w-4 sm:mr-2" />
            <span className="hidden lg:inline">Categories</span>
          </Button>
          <Button
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Add Service</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="border-b bg-white px-4 lg:px-6 py-4 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {(searchQuery || selectedCategoryId) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Categories:</span>
          <Button
            variant={selectedCategoryId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategoryId(null)}
            style={selectedCategoryId === null ? { backgroundColor: '#d52329' } : {}}
            className={selectedCategoryId === null ? 'text-white hover:opacity-90' : ''}
          >
            All Services
            <Badge variant="secondary" className="ml-2">
              {services.length}
            </Badge>
          </Button>
          {categories.map((category) => {
            const count = getCategoryCount(category.id)
            return (
              <Button
                key={category.id}
                variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryId(category.id)}
                style={selectedCategoryId === category.id ? { backgroundColor: '#d52329' } : {}}
                className={selectedCategoryId === category.id ? 'text-white hover:opacity-90' : ''}
              >
                {category.name}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No services found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery
                ? `No services match "${searchQuery}"`
                : 'No services in this category'}
            </p>
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryServices = getServicesForCategory(category.id)

              if (categoryServices.length === 0) return null

              return (
              <div key={category.id}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold" style={{ color: '#d52329' }}>
                    {category.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>

                <div className="space-y-3">
                  {categoryServices.map((service) => (
                    <Card key={service.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Service Name and Actions */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{service.name}</h3>
                                {service.description && (
                                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  Duration: {service.duration_text || `${service.duration_minutes || 0} minutes`}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingService(service)}
                                  disabled={deleting}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteService(service.id)}
                                  disabled={deleting}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            {/* Pricing Grid */}
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                Pricing (inc VAT)
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-blue-700 mb-1">Small</div>
                                  <div className="text-lg font-bold text-blue-900">{formatPrice(getPriceForSize(service, 'small'))}</div>
                                </div>
                                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-green-700 mb-1">Medium</div>
                                  <div className="text-lg font-bold text-green-900">{formatPrice(getPriceForSize(service, 'medium'))}</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-orange-700 mb-1">Large</div>
                                  <div className="text-lg font-bold text-orange-900">{formatPrice(getPriceForSize(service, 'large'))}</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                  <div className="text-xs font-medium text-red-700 mb-1">XL</div>
                                  <div className="text-lg font-bold text-red-900">{formatPrice(getPriceForSize(service, 'xl'))}</div>
                                </div>
                              </div>
                            </div>

                            {!service.is_active && (
                              <div className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                Inactive
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {editingService && (
        <EditServiceDialog
          service={editingService}
          onClose={() => setEditingService(null)}
        />
      )}

      {showCreateDialog && (
        <CreateServiceDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {showCategoryDialog && (
        <CategoryManagementDialog
          open={showCategoryDialog}
          onClose={() => setShowCategoryDialog(false)}
        />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice, formatPriceExclVAT, getVehicleSizeDisplay } from '@/types/services'
import { CheckCircle2, Info } from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string
  display_order: number
}

interface Service {
  id: string
  category_id: string
  name: string
  description: string
  duration_text: string
  availability: string
  includes: string[]
  notes: string
  default_coating_years: number
  warranty_years: number
  requires_quote: boolean
  category: Category
  pricing: Array<{
    vehicle_size: string
    price_excl_vat: number
    price_incl_vat: number
  }>
}

interface AddOn {
  id: string
  name: string
  description: string
  price_excl_vat: number
  price_incl_vat: number
  is_variable_price: boolean
  addon_type: string
}

interface ServiceAddOn {
  service_id: string
  add_on_id: string
  add_on: AddOn
  display_order: number
}

interface Props {
  categories: Category[]
  services: Service[]
  addOns: AddOn[]
  serviceAddOns: ServiceAddOn[]
}

export function ServicesManagement({ categories, services, addOns, serviceAddOns }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Filter services by category
  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category_id === selectedCategory)

  // Get add-ons for a specific service
  const getServiceAddOns = (serviceId: string) => {
    return serviceAddOns
      .filter(sa => sa.service_id === serviceId)
      .map(sa => sa.add_on)
      .filter(Boolean)
  }

  return (
    <div className="space-y-6">
      {/* Category Filter Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All Services</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-6 mt-6">
          {filteredServices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No services found in this category
              </CardContent>
            </Card>
          ) : (
            filteredServices.map(service => {
              const serviceAddOns = getServiceAddOns(service.id)

              return (
                <Card key={service.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{service.name}</CardTitle>
                          {service.requires_quote && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              P.O.A
                            </Badge>
                          )}
                          {service.availability && (
                            <Badge variant="secondary">
                              {service.availability === 'both' ? 'Mobile & Unit' :
                               service.availability === 'mobile' ? 'Mobile Only' : 'Unit Only'}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {service.category?.name} • {service.duration_text}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Pricing Table */}
                    {!service.requires_quote && service.pricing.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Pricing by Vehicle Size</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {service.pricing
                            .sort((a, b) => {
                              const order: Record<string, number> = { small: 1, medium: 2, large: 3, xl: 4 }
                              return order[a.vehicle_size] - order[b.vehicle_size]
                            })
                            .map(price => (
                              <div key={price.vehicle_size} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {getVehicleSizeDisplay(price.vehicle_size as any)}
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                  {formatPrice(price.price_incl_vat)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatPriceExclVAT(price.price_excl_vat)}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* What's Included */}
                    {service.includes && service.includes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">What's Included</h4>
                        <div className="grid md:grid-cols-2 gap-2">
                          {service.includes.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Add-ons */}
                    {serviceAddOns.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Add-ons</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {serviceAddOns.map(addon => (
                            <div key={addon.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">
                                    {addon.name}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {addon.description}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {addon.is_variable_price ? (
                                    <span className="text-xs font-medium text-gray-600">P.O.A</span>
                                  ) : (
                                    <>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {formatPrice(addon.price_incl_vat)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        +VAT
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coating/Warranty Info */}
                    {(service.default_coating_years || service.warranty_years) && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {service.default_coating_years && (
                            <span>Includes {service.default_coating_years}-year ceramic coating. </span>
                          )}
                          {service.warranty_years && (
                            <span>{service.warranty_years}-year warranty included.</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {service.notes && (
                      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {service.notes}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-900">{services.length}</div>
              <div className="text-sm text-blue-700 mt-1">Total Services</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-900">{categories.length}</div>
              <div className="text-sm text-blue-700 mt-1">Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-900">{addOns.length}</div>
              <div className="text-sm text-blue-700 mt-1">Add-ons Available</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

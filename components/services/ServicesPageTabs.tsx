'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Settings } from 'lucide-react'
import { ServicesManagement } from './ServicesManagement'
import { ServicesList } from './ServicesList'

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

interface ServiceForList {
  id: string
  category_id: string
  name: string
  description: string | null
  duration_hours: number | null
  duration_minutes: number
  duration_text: string
  availability: string
  includes: string[]
  notes: string | null
  default_coating_years: number | null
  warranty_years: number | null
  remote_bookable: boolean
  is_active: boolean
  requires_quote: boolean
  display_order: number
  created_at: string
  updated_at: string
  category: {
    id: string
    name: string
    description: string | null
    display_order: number
    active: boolean
    created_at: string
  }
  pricing?: Array<{
    vehicle_size: string
    price_excl_vat: number
    price_incl_vat: number
  }>
}

interface Props {
  categories: Category[]
  services: Service[]
  addOns: AddOn[]
  serviceAddOns: ServiceAddOn[]
  servicesForList: ServiceForList[]
}

export function ServicesPageTabs({
  categories,
  services,
  addOns,
  serviceAddOns,
  servicesForList
}: Props) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold" style={{ color: '#32373c' }}>
          Services Management
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          View and manage Detail Dynamics services, pricing, and add-ons
        </p>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="display" className="flex-1 flex flex-col">
        <div className="border-b bg-white px-6">
          <TabsList className="h-12">
            <TabsTrigger value="display" className="gap-2">
              <Eye className="h-4 w-4" />
              Services Display
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="display" className="flex-1 overflow-y-auto bg-gray-50 p-6 m-0">
          <ServicesManagement
            categories={categories}
            services={services}
            addOns={addOns}
            serviceAddOns={serviceAddOns}
          />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
          <ServicesList
            initialServices={servicesForList as any}
            initialCategories={categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              description: cat.description,
              display_order: cat.display_order,
              active: true,
              created_at: new Date().toISOString(),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

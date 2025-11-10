import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ServicesPageTabs } from '@/components/services/ServicesPageTabs'

// Disable cache to ensure real-time updates
export const revalidate = 0

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all categories
  const { data: categories } = await supabase
    .from('service_categories')
    .select('*')
    .order('display_order')

  // Fetch all services with their categories and pricing (for display view)
  const { data: services } = await supabase
    .from('services')
    .select(`
      *,
      category:service_categories(*),
      pricing:service_pricing(*)
    `)
    .eq('is_active', true)
    .order('display_order')

  // Fetch all services with categories and pricing (for management list)
  const { data: servicesForList } = await supabase
    .from('services')
    .select(`
      *,
      category:service_categories(*),
      pricing:service_pricing(*)
    `)
    .order('display_order')

  // Fetch all add-ons
  const { data: addOns } = await supabase
    .from('add_ons')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Fetch service-addon relationships
  const { data: serviceAddOns } = await supabase
    .from('service_add_ons')
    .select(`
      *,
      add_on:add_ons(*)
    `)
    .order('display_order')

  return (
    <div className="min-h-screen bg-gray-50">
      <ServicesPageTabs
        categories={categories || []}
        services={services || []}
        addOns={addOns || []}
        serviceAddOns={serviceAddOns || []}
        servicesForList={servicesForList || []}
      />
    </div>
  )
}

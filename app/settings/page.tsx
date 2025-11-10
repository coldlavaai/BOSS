import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

export const revalidate = 0 // Always fetch fresh data

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch pipeline stages for management
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('display_order')

  // Fetch calendar settings
  const { data: calendarSettings } = await supabase
    .from('calendar_settings')
    .select('*')
    .single()

  // Fetch all services for duration management
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('display_order')

  // Fetch email integrations for signature management
  const { data: emailIntegrations } = await supabase
    .from('email_integrations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="h-full">
      <SettingsTabs
        initialStages={stages || []}
        calendarSettings={calendarSettings}
        services={services || []}
        emailIntegrations={emailIntegrations || []}
      />
    </div>
  )
}

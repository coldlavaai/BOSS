import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BossSettingsTabs } from '@/components/settings/BossSettingsTabs'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Configure your BOSS system and preferences</p>
      </div>

      <BossSettingsTabs user={user} />
    </div>
  )
}

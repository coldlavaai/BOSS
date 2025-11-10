'use client'

import { User } from '@supabase/supabase-js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'

interface BossSettingsTabsProps {
  user: User
}

export function BossSettingsTabs({ user }: BossSettingsTabsProps) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="bg-white">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="adhd">ADHD Features</TabsTrigger>
        <TabsTrigger value="targets">Targets</TabsTrigger>
        <TabsTrigger value="vault">Secure Vault</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input type="text" className="w-full p-2 border rounded" placeholder="Cold Lava" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate (£)</label>
              <input type="number" className="w-full p-2 border rounded" placeholder="50.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="w-full p-2 border rounded" value={user.email} disabled />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="adhd">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">ADHD Features</h2>
          <p className="text-slate-600 mb-4">Optimize BOSS for ADHD-friendly workflows</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Daily Check-in Time</label>
              <input type="time" className="w-full p-2 border rounded" defaultValue="09:00" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="streaks" defaultChecked />
              <label htmlFor="streaks">Enable streak tracking</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="achievements" defaultChecked />
              <label htmlFor="achievements">Show achievements</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="focus-mode" />
              <label htmlFor="focus-mode">Enable focus mode</label>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="targets">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Business Targets</h2>
          <p className="text-slate-600 mb-4">Set your weekly and monthly goals</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weekly Revenue Target (£)</label>
              <input type="number" className="w-full p-2 border rounded" placeholder="2000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Revenue Target (£)</label>
              <input type="number" className="w-full p-2 border rounded" placeholder="8000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weekly Hours Target</label>
              <input type="number" className="w-full p-2 border rounded" placeholder="40" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly New Clients Target</label>
              <input type="number" className="w-full p-2 border rounded" placeholder="3" />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Save Targets
            </button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="vault">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Secure Vault</h2>
          <p className="text-slate-600 mb-4">Store client credentials, API keys, and passwords securely</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">🔒 Coming soon: AES-256 encrypted credential storage</p>
          </div>
          <div className="space-y-4 opacity-50">
            <div>
              <label className="block text-sm font-medium mb-1">Master Password</label>
              <input type="password" className="w-full p-2 border rounded" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Master Password</label>
              <input type="password" className="w-full p-2 border rounded" disabled />
            </div>
            <button className="bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed" disabled>
              Enable Vault (Coming Soon)
            </button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="integrations">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <p className="text-slate-600 mb-4">Connect BOSS with your tools</p>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Claude AI</h3>
              <p className="text-sm text-slate-600 mb-2">Enable daily accountability check-ins</p>
              <input type="text" className="w-full p-2 border rounded mb-2" placeholder="Claude API Key" />
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Connect Claude
              </button>
            </div>
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Calendar Integration</h3>
              <p className="text-sm text-slate-600 mb-2">Sync with Google Calendar or Cal.com</p>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600">Coming soon</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Call Recording</h3>
              <p className="text-sm text-slate-600 mb-2">Integrate Otter.ai or other transcription services</p>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600">Coming soon</p>
              </div>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

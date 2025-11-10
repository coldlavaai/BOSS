'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralSettings } from './GeneralSettings'
import { PipelineStagesSettings } from './PipelineStagesSettings'
import { WebhookSettings } from './WebhookSettings'
import { IntegrationsSettings } from './IntegrationsSettings'
import { CalendarSettings } from './CalendarSettings'
import { ServiceDurationSettings } from './ServiceDurationSettings'
import { EmailSettings } from './EmailSettings'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type CalendarSettingsType = Database['public']['Tables']['calendar_settings']['Row']
type Service = Database['public']['Tables']['services']['Row']
type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']

interface SettingsTabsProps {
  initialStages: PipelineStage[]
  calendarSettings: CalendarSettingsType | null
  services: Service[]
  emailIntegrations: EmailIntegration[]
}

export function SettingsTabs({ initialStages, calendarSettings, services, emailIntegrations }: SettingsTabsProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 lg:px-6 py-3 lg:py-4">
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#32373c' }}>
          Settings
        </h1>
        <p className="text-xs lg:text-sm text-gray-600 mt-1">
          Configure your CRM preferences and integrations
        </p>
      </div>

      {/* Settings Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="general" className="h-full flex flex-col">
          <div className="border-b bg-white overflow-x-auto">
            <div className="px-4 lg:px-6 min-w-max">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger value="general" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm">
                  General
                </TabsTrigger>
                <TabsTrigger value="calendar" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm whitespace-nowrap">
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="services" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm whitespace-nowrap">
                  Services
                </TabsTrigger>
                <TabsTrigger value="stages" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm whitespace-nowrap">
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="email" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm">
                  Email
                </TabsTrigger>
                <TabsTrigger value="webhooks" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm">
                  Webhooks
                </TabsTrigger>
                <TabsTrigger value="integrations" className="px-3 py-2.5 lg:px-4 lg:py-3 text-sm">
                  Integrations
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50">
            <TabsContent value="general" className="m-0 h-full">
              <GeneralSettings />
            </TabsContent>

            <TabsContent value="calendar" className="m-0 h-full">
              <CalendarSettings initialSettings={calendarSettings} />
            </TabsContent>

            <TabsContent value="services" className="m-0 h-full">
              <ServiceDurationSettings services={services} />
            </TabsContent>

            <TabsContent value="stages" className="m-0 h-full">
              <PipelineStagesSettings initialStages={initialStages} />
            </TabsContent>

            <TabsContent value="email" className="m-0 h-full">
              <EmailSettings emailIntegrations={emailIntegrations} />
            </TabsContent>

            <TabsContent value="webhooks" className="m-0 h-full">
              <WebhookSettings />
            </TabsContent>

            <TabsContent value="integrations" className="m-0 h-full">
              <IntegrationsSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

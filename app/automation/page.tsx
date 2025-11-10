import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Variable, Workflow, Zap, History } from 'lucide-react'
import { EmailTemplateEditor } from '@/components/automation/EmailTemplateEditor'
import { CustomVariablesManager } from '@/components/automation/CustomVariablesManager'
import { AutomationRulesManager } from '@/components/automation/AutomationRulesManager'
import { AutomationLogsViewer } from '@/components/automation/AutomationLogsViewer'

export default function AutomationPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <Zap className="h-6 w-6 lg:h-8 lg:w-8 flex-shrink-0" style={{ color: '#d52329' }} />
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold truncate" style={{ color: '#32373c' }}>
              Automation
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 hidden sm:block">
              Email templates, custom variables, and workflow automation
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 lg:p-6">
        <Tabs defaultValue="templates" className="space-y-4 lg:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full max-w-4xl grid-cols-4 min-w-max">
              <TabsTrigger value="templates" className="gap-1 lg:gap-2 text-xs lg:text-sm whitespace-nowrap">
                <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Email Templates</span>
                <span className="sm:hidden">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="variables" className="gap-1 lg:gap-2 text-xs lg:text-sm whitespace-nowrap">
                <Variable className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Custom Variables</span>
                <span className="sm:hidden">Variables</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1 lg:gap-2 text-xs lg:text-sm whitespace-nowrap">
                <Workflow className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Automation Rules</span>
                <span className="sm:hidden">Rules</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 lg:gap-2 text-xs lg:text-sm whitespace-nowrap">
                <History className="h-3 w-3 lg:h-4 lg:w-4" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Email Templates Tab */}
          <TabsContent value="templates">
            <EmailTemplateEditor />
          </TabsContent>

          {/* Custom Variables Tab */}
          <TabsContent value="variables">
            <CustomVariablesManager />
          </TabsContent>

          {/* Automation Rules Tab */}
          <TabsContent value="rules">
            <AutomationRulesManager />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <AutomationLogsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

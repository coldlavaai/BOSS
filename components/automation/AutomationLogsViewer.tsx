'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock, Mail } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type AutomationLog = Database['public']['Tables']['email_automation_logs']['Row'] & {
  email_automation_rules: {
    name: string
    trigger_type: string
  } | null
  jobs: {
    id: string
    customer_id: string
  } | null
}

export function AutomationLogsViewer() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('email_automation_logs')
        .select(`
          *,
          email_automation_rules (name, trigger_type),
          jobs (id, customer_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter === 'success') {
        query = query.eq('status', 'success')
      } else if (filter === 'error') {
        query = query.neq('status', 'success')
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automation History</h2>
          <p className="text-sm text-gray-600">
            View execution history of all automation rules
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Errors
          </button>
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No automation logs yet
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'all'
                ? 'Automation logs will appear here when rules are triggered'
                : filter === 'success'
                ? 'No successful automations yet'
                : 'No errors found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {log.email_automation_rules?.name || 'Unknown Rule'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {log.email_automation_rules?.trigger_type?.replace('_', ' ') || 'Manual'}
                        </p>
                      </div>
                      <Badge
                        variant={log.status === 'success' ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {log.status === 'success' ? 'Success' : 'Failed'}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 ml-8">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>
                          Email to: <strong>{log.sent_to?.[0] || 'Unknown'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {log.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Error:</strong> {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

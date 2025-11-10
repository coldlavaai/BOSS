'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCards } from './DashboardCards'
import { Database } from '@/types/database'
import { format, addMonths } from 'date-fns'

type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface GoogleIntegration {
  calendar_name: string | null
  calendar_id: string
  last_sync_at: string | null
  two_way_sync_enabled: boolean
}

interface DashboardWithNavProps {
  jobs: Job[]
  googleIntegration: GoogleIntegration | null
}

export function DashboardWithNav({ jobs, googleIntegration }: DashboardWithNavProps) {
  const [monthOffset, setMonthOffset] = useState(0)

  const currentDate = addMonths(new Date(), monthOffset)
  const isCurrentMonth = monthOffset === 0

  return (
    <>
      {!isCurrentMonth && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthOffset(monthOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="text-sm font-semibold text-blue-900">
            Viewing: {format(currentDate, 'MMMM yyyy')}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthOffset(monthOffset + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {isCurrentMonth && monthOffset < 12 && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthOffset(1)}
          >
            View Next Month
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <DashboardCards
        jobs={jobs}
        googleIntegration={googleIntegration}
        monthOffset={monthOffset}
      />
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CustomerDetailsTab } from './tabs/CustomerDetailsTab'
import { CustomerVehiclesTab } from './tabs/CustomerVehiclesTab'
import { CustomerCurrentJobsTab } from './tabs/CustomerCurrentJobsTab'
import { CustomerJobHistoryTab } from './tabs/CustomerJobHistoryTab'
import { CustomerCommunicationsTab } from './tabs/CustomerCommunicationsTab'
import { CreateJobDialog } from '../board/CreateJobDialog'

type Customer = Database['public']['Tables']['customers']['Row']
type Car = Database['public']['Tables']['cars']['Row']
type Job = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

interface CustomerDetailDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerUpdated: (customer: Customer) => void
}

export function CustomerDetailDialog({
  customer,
  open,
  onOpenChange,
  onCustomerUpdated,
}: CustomerDetailDialogProps) {
  const [cars, setCars] = useState<Car[]>([])
  const [currentJobs, setCurrentJobs] = useState<Job[]>([])
  const [jobHistory, setJobHistory] = useState<Job[]>([])
  const [communicationsCount, setCommunicationsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (customer && open) {
      loadCustomerData()
    }
  }, [customer, open])

  const loadCustomerData = async () => {
    if (!customer) return
    setLoading(true)

    try {
      // Load cars
      const { data: carsData } = await supabase
        .from('cars')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })

      if (carsData) setCars(carsData)

      // Load all jobs for this customer with full details
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          car:cars(*),
          service:services(*),
          pipeline_stage:pipeline_stages(*)
        `)
        .eq('customer_id', customer.id)
        .order('booking_datetime', { ascending: false })

      if (jobsData) {
        // Split into current and history
        const current = jobsData.filter(
          (job: any) => !job.pipeline_stage?.is_archived
        )
        const history = jobsData.filter(
          (job: any) => job.pipeline_stage?.is_archived
        )

        setCurrentJobs(current as Job[])
        setJobHistory(history as Job[])
      }

      // Load communications count
      const [emailsRes, smsRes] = await Promise.all([
        supabase
          .from('email_threads')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customer.id),
        supabase
          .from('sms_messages')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customer.id),
      ])

      const emailCount = emailsRes.count || 0
      const smsCount = smsRes.count || 0
      setCommunicationsCount(emailCount + smsCount)
    } catch (error) {
      console.error('Error loading customer data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        <div className="flex items-start justify-between pb-4 border-b">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-bold">{customer.name}</DialogTitle>
            <DialogDescription className="text-base">
              {customer.business_name && `${customer.business_name} • `}
              {customer.email}
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => setIsCreateJobOpen(true)}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90 ml-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5 h-12 mb-4">
            <TabsTrigger value="details" className="text-sm">Details</TabsTrigger>
            <TabsTrigger value="vehicles" className="text-sm">
              Vehicles ({cars.length})
            </TabsTrigger>
            <TabsTrigger value="current" className="text-sm">
              Current ({currentJobs.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              History ({jobHistory.length})
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-sm">
              Comms ({communicationsCount})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="mt-0">
              <CustomerDetailsTab
                customer={customer}
                onCustomerUpdated={(updated) => {
                  onCustomerUpdated(updated)
                  loadCustomerData()
                }}
              />
            </TabsContent>

            <TabsContent value="vehicles" className="mt-0">
              <CustomerVehiclesTab
                customerId={customer.id}
                customerName={customer.name}
                cars={cars}
                onCarsUpdated={loadCustomerData}
              />
            </TabsContent>

            <TabsContent value="current" className="mt-0">
              <CustomerCurrentJobsTab
                jobs={currentJobs}
                onJobsUpdated={loadCustomerData}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <CustomerJobHistoryTab jobs={jobHistory} />
            </TabsContent>

            <TabsContent value="communications" className="mt-0">
              <CustomerCommunicationsTab customerId={customer.id} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Create Job Dialog */}
        <CreateJobDialog
          open={isCreateJobOpen}
          onOpenChange={setIsCreateJobOpen}
          onJobCreated={(newJob) => {
            loadCustomerData() // Refresh the jobs list
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

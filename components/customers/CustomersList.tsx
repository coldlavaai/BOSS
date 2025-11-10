'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Mail, Phone, Briefcase, Car, Eye } from 'lucide-react'
import { AddCustomerDialog } from './AddCustomerDialog'
import { CustomerDetailDialog } from './CustomerDetailDialog'
import { CopyButton } from '@/components/ui/copy-button'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

type Customer = Database['public']['Tables']['customers']['Row'] & {
  cars: Database['public']['Tables']['cars']['Row'][]
  totalJobs?: number
  currentJobs?: number
  lastCommunication?: string | null
}

interface CustomersListProps {
  initialCustomers: Customer[]
  initialCustomerId?: string
}

export function CustomersList({ initialCustomers, initialCustomerId }: CustomersListProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const router = useRouter()

  // Auto-open customer detail dialog if initialCustomerId is provided
  useEffect(() => {
    if (initialCustomerId) {
      const customer = customers.find((c) => c.id === initialCustomerId)
      if (customer) {
        setViewingCustomer(customer)
      }
    }
  }, [initialCustomerId, customers])

  // Clear URL param when dialog closes
  const handleCloseDialog = () => {
    setViewingCustomer(null)
    if (initialCustomerId) {
      router.push('/customers')
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase()

    // Search in basic customer fields
    const matchesBasicFields =
      customer.customer_id?.toString().includes(query) ||
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      (customer.business_name?.toLowerCase().includes(query))

    // Search in car details (make, model, registration)
    const matchesCarDetails = customer.cars.some((car) =>
      car.make?.toLowerCase().includes(query) ||
      car.model?.toLowerCase().includes(query) ||
      car.registration_plate?.toLowerCase().includes(query)
    )

    return matchesBasicFields || matchesCarDetails
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold truncate" style={{ color: '#32373c' }}>
              Customers
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 hidden sm:block">
              Manage your customer database
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            style={{ backgroundColor: '#d52329' }}
            className="text-white hover:opacity-90 flex-shrink-0"
            size="sm"
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Add Customer</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 overflow-auto bg-white">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </div>
            {!searchQuery && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-center">Total Jobs</TableHead>
                <TableHead className="text-center">Current Jobs</TableHead>
                <TableHead>Last Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                // Get primary vehicle (first car with make/model)
                const primaryVehicle = customer.cars.find(c => c.make && c.model)
                const vehicleDisplay = primaryVehicle
                  ? `${primaryVehicle.make} ${primaryVehicle.model}`
                  : customer.cars.length > 0
                  ? `${customer.cars.length} vehicle${customer.cars.length > 1 ? 's' : ''}`
                  : '-'

                return (
                  <TableRow key={customer.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-1">
                        {customer.customer_id}
                        <CopyButton value={customer.customer_id.toString()} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingCustomer(customer)}
                        title="View customer details"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {customer.email}
                        <CopyButton value={customer.email} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {customer.phone}
                        <CopyButton value={customer.phone} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {customer.business_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {vehicleDisplay}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {customer.totalJobs || 0}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {customer.currentJobs || 0}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {customer.lastCommunication
                        ? formatDistanceToNow(new Date(customer.lastCommunication), { addSuffix: true })
                        : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCustomerAdded={(newCustomer) => {
          setCustomers([{ ...newCustomer, cars: [] }, ...customers])
          setIsAddDialogOpen(false)
        }}
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={viewingCustomer}
        open={!!viewingCustomer}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
        onCustomerUpdated={(updatedCustomer) => {
          setCustomers(
            customers.map((c) =>
              c.id === updatedCustomer.id ? { ...updatedCustomer, cars: c.cars, totalJobs: c.totalJobs, currentJobs: c.currentJobs, lastCommunication: c.lastCommunication } : c
            )
          )
        }}
      />
    </div>
  )
}

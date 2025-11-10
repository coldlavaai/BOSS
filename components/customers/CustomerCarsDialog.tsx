'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Car as CarIcon } from 'lucide-react'
import { AddCarDialog } from './AddCarDialog'
import { Card, CardContent } from '@/components/ui/card'

type Car = Database['public']['Tables']['cars']['Row']

interface CustomerCarsDialogProps {
  customerId: string
  customerName: string
  initialCars: Car[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerCarsDialog({
  customerId,
  customerName,
  initialCars,
  open,
  onOpenChange,
}: CustomerCarsDialogProps) {
  const [cars, setCars] = useState<Car[]>(initialCars)
  const [isAddCarOpen, setIsAddCarOpen] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{customerName}'s Vehicles</DialogTitle>
            <DialogDescription>
              Manage vehicles for this customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {cars.length} {cars.length === 1 ? 'vehicle' : 'vehicles'}
              </div>
              <Button
                onClick={() => setIsAddCarOpen(true)}
                size="sm"
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>

            {cars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No vehicles added yet</p>
                <Button
                  onClick={() => setIsAddCarOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vehicle
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {cars.map((car) => (
                  <Card key={car.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {car.make} {car.model}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1 mt-1">
                            <div>
                              <span className="font-medium">Year:</span> {car.year}
                            </div>
                            {car.color && (
                              <div>
                                <span className="font-medium">Color:</span> {car.color}
                              </div>
                            )}
                            {car.registration_plate && (
                              <div>
                                <span className="font-medium">Reg:</span> {car.registration_plate}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Size:</span>{' '}
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    car.size_category === 'Small'
                                      ? '#DBEAFE'
                                      : car.size_category === 'Medium'
                                      ? '#D1FAE5'
                                      : car.size_category === 'Large'
                                      ? '#FEF3C7'
                                      : '#FEE2E2',
                                  color:
                                    car.size_category === 'Small'
                                      ? '#1E40AF'
                                      : car.size_category === 'Medium'
                                      ? '#065F46'
                                      : car.size_category === 'Large'
                                      ? '#92400E'
                                      : '#991B1B',
                                }}
                              >
                                {car.size_category}
                              </span>
                            </div>
                            {car.notes && (
                              <div className="mt-2 text-gray-500 italic">
                                {car.notes}
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
        </DialogContent>
      </Dialog>

      <AddCarDialog
        customerId={customerId}
        customerName={customerName}
        open={isAddCarOpen}
        onOpenChange={setIsAddCarOpen}
        onCarAdded={(newCar) => {
          setCars([...cars, newCar])
          setIsAddCarOpen(false)
        }}
      />
    </>
  )
}

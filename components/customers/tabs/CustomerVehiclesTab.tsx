'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { Plus, Car as CarIcon, Edit, Trash2 } from 'lucide-react'
import { AddCarDialog } from '../AddCarDialog'

type Car = Database['public']['Tables']['cars']['Row']

interface CustomerVehiclesTabProps {
  customerId: string
  customerName: string
  cars: Car[]
  onCarsUpdated: () => void
}

export function CustomerVehiclesTab({
  customerId,
  customerName,
  cars,
  onCarsUpdated,
}: CustomerVehiclesTabProps) {
  const [isAddCarOpen, setIsAddCarOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CarIcon className="h-5 w-5" style={{ color: '#d52329' }} />
          Vehicles ({cars.length})
        </h3>
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
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <CarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 mb-4">No vehicles added yet</p>
          <Button
            onClick={() => setIsAddCarOpen(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Vehicle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cars.map((car) => (
            <Card key={car.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {car.make} {car.model}
                    </h4>
                    <p className="text-sm text-gray-500">{car.year}</p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium"
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
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {car.color && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Color:</span>
                      <span className="font-medium">{car.color}</span>
                    </div>
                  )}
                  {car.registration_plate && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Registration:</span>
                      <span className="font-medium uppercase">{car.registration_plate}</span>
                      <CopyButton value={car.registration_plate} />
                    </div>
                  )}
                  {car.notes && (
                    <div className="pt-2 mt-2 border-t text-gray-600 italic">
                      {car.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddCarDialog
        customerId={customerId}
        customerName={customerName}
        open={isAddCarOpen}
        onOpenChange={setIsAddCarOpen}
        onCarAdded={() => {
          onCarsUpdated()
          setIsAddCarOpen(false)
        }}
      />
    </div>
  )
}

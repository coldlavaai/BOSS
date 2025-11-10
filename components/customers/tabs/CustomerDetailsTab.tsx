'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/ui/copy-button'
import { Mail, Phone, Briefcase, Save } from 'lucide-react'

type Customer = Database['public']['Tables']['customers']['Row']

interface CustomerDetailsTabProps {
  customer: Customer
  onCustomerUpdated: (customer: Customer) => void
}

export function CustomerDetailsTab({
  customer,
  onCustomerUpdated,
}: CustomerDetailsTabProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    business_name: customer.business_name || '',
    notes: customer.notes || '',
  })

  const supabase = createClient()

  useEffect(() => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      business_name: customer.business_name || '',
      notes: customer.notes || '',
    })
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: submitError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          business_name: formData.business_name || null,
          notes: formData.notes || null,
        })
        .eq('id', customer.id)
        .select()
        .single()

      if (submitError) {
        if (submitError.code === '23505') {
          if (submitError.message.includes('email')) {
            setError('A customer with this email already exists')
          } else if (submitError.message.includes('phone')) {
            setError('A customer with this phone number already exists')
          } else {
            setError('This customer already exists')
          }
        } else {
          setError(submitError.message)
        }
        return
      }

      if (data) {
        onCustomerUpdated(data)
        setError(null)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer ID Badge */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 font-medium">Customer ID</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-2xl font-bold font-mono text-gray-900">
                {customer.customer_id}
              </div>
              <CopyButton value={customer.customer_id.toString()} />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" style={{ color: '#d52329' }} />
          Contact Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              placeholder="Company Ltd"
              value={formData.business_name}
              onChange={(e) =>
                setFormData({ ...formData, business_name: e.target.value })
              }
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notes</h3>
        <Textarea
          id="notes"
          placeholder="Any special requirements or preferences..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={loading}
          rows={4}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: '#d52329' }}
          className="text-white hover:opacity-90"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

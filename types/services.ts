/**
 * TypeScript types for the Detail Dynamics Services System
 *
 * Generated from database/migrate-services-system.sql
 */

export type VehicleSize = 'small' | 'medium' | 'large' | 'xl'

export type ServiceAvailability = 'mobile' | 'unit' | 'both'

export type AddOnType = 'standard' | 'upgrade' | 'coating_upgrade'

// ============================================================================
// Database Table Types
// ============================================================================

export interface ServiceCategory {
  id: string
  name: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  category_id: string | null
  name: string
  description: string | null
  duration_hours: number | null
  duration_text: string | null
  availability: ServiceAvailability | null
  includes: string[] | null
  notes: string | null
  default_coating_years: number | null
  warranty_years: number | null
  is_active: boolean
  requires_quote: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface ServicePricing {
  id: string
  service_id: string
  vehicle_size: VehicleSize
  price_excl_vat: number // in pence
  price_incl_vat: number  // in pence
  created_at: string
  updated_at: string
}

export interface AddOn {
  id: string
  name: string
  description: string | null
  price_excl_vat: number | null // in pence, null for variable pricing
  price_incl_vat: number | null  // in pence
  is_variable_price: boolean
  addon_type: AddOnType | null
  from_years: number | null // For coating upgrades
  to_years: number | null   // For coating upgrades
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceAddOn {
  id: string
  service_id: string
  add_on_id: string
  override_price_excl_vat: number | null
  override_price_incl_vat: number | null
  display_order: number
  created_at: string
}

// ============================================================================
// Joined/Extended Types for UI
// ============================================================================

export interface ServiceWithCategory extends Service {
  category: ServiceCategory | null
}

export interface ServiceWithPricing extends Service {
  category: ServiceCategory | null
  pricing: ServicePricing[]
}

export interface ServiceWithAll extends Service {
  category: ServiceCategory | null
  pricing: ServicePricing[]
  available_addons: AddOnWithDetails[]
}

export interface AddOnWithDetails extends AddOn {
  // Includes override pricing if part of service_add_ons join
  override_price_excl_vat?: number | null
  override_price_incl_vat?: number | null
  display_order?: number
}

// ============================================================================
// UI/Form Types
// ============================================================================

export interface ServiceFormData {
  category_id: string
  name: string
  description: string
  duration_hours: number | null
  duration_text: string
  availability: ServiceAvailability
  includes: string[]
  notes: string
  default_coating_years: number | null
  warranty_years: number | null
  requires_quote: boolean
}

export interface ServicePricingFormData {
  small_excl: number
  small_incl: number
  medium_excl: number
  medium_incl: number
  large_excl: number
  large_incl: number
  xl_excl: number
  xl_incl: number
}

export interface AddOnFormData {
  name: string
  description: string
  price_excl_vat: number | null
  price_incl_vat: number | null
  is_variable_price: boolean
  addon_type: AddOnType
  from_years: number | null
  to_years: number | null
}

export interface JobServiceSelection {
  service_id: string
  vehicle_size: VehicleSize
  selected_addon_ids: string[]
  base_price_incl_vat: number
  addons_price_incl_vat: number
  total_price_incl_vat: number
}

// ============================================================================
// Helper Functions
// ============================================================================

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`
}

export function formatPriceExclVAT(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)} +VAT`
}

export function calculateVAT(priceExclVAT: number): number {
  return Math.round(priceExclVAT * 0.2) // 20% VAT
}

export function addVAT(priceExclVAT: number): number {
  return Math.round(priceExclVAT * 1.2) // Add 20% VAT
}

export function getVehicleSizeDisplay(size: VehicleSize): string {
  const displayNames: Record<VehicleSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    xl: 'Extra Large (XL)'
  }
  return displayNames[size]
}

export function getAvailabilityDisplay(availability: ServiceAvailability): string {
  const displayNames: Record<ServiceAvailability, string> = {
    mobile: 'Mobile Only',
    unit: 'Unit Only',
    both: 'Mobile & Unit'
  }
  return displayNames[availability]
}

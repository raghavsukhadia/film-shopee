/**
 * Vehicle-related type definitions
 */

export interface Vehicle {
  id: string
  shortId?: string
  regNo: string
  make: string
  model: string
  year?: number
  color?: string
  vehicleType?: string
  odometerReading?: number
  customer: string
  customerPhone: string
  customerEmail?: string
  customerAddress?: string
  status: VehicleStatus
  priority: 'low' | 'medium' | 'high'
  issues?: string
  accessories?: string
  estimatedCost?: number
  created_at: string
  updated_at?: string
  tenant_id?: string
}

export type VehicleStatus =
  | 'pending'
  | 'in_progress'
  | 'under_installation'
  | 'installation_complete'
  | 'completed'
  | 'delivered'
  | 'complete_and_delivered'
  | 'delivered_final'

export interface VehicleInwardFormData {
  ownerName: string
  mobileNumber: string
  email?: string
  vehicleNumber: string
  modelName: string
  make?: string
  year?: string
  color?: string
  odometerReading?: string
  vehicleType?: string
  expectedDelivery?: string
  priority: 'low' | 'medium' | 'high'
  managerPerson?: string
  location?: string
  issuesReported: string
  remark?: string
}

export interface ProductItem {
  product: string
  brand: string
  price: string
  department: string
}


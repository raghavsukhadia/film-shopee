/**
 * Billing and accounting-related type definitions
 */

export interface AccountEntry {
  id: string
  shortId?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  vehicleNumber: string
  model: string
  make: string
  year?: number
  color?: string
  vehicleType?: string
  location?: string
  manager?: string
  installationCompleteDate: string
  expectedDelivery?: string
  products: ProductDetail[]
  totalAmount: number
  status: string
  created_at: string
  completed_at?: string
  discountAmount?: number
  discountPercentage?: number
  discountOfferedBy?: string
  discountReason?: string
  finalAmount?: number
  invoiceNumber?: string
  billingStatus?: 'draft' | 'invoiced' | 'closed'
  invoiceDate?: string
  invoiceAmount?: number
  taxAmount?: number
  netPayable?: number
  dueDate?: string
  billingClosedAt?: string
  payments?: Payment[]
  totalPaid?: number
  balanceDue?: number
}

export interface ProductDetail {
  product: string
  brand: string
  price: number
  department: string
}

export interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  vehicle_inward_id: string
  notes?: string
  created_at?: string
  created_by?: string
}

export interface BillingStats {
  totalEntries: number
  totalRevenue: number
  totalReceivable: number
  outstandingAmount: number
  partialPaymentsCount: number
  overdueEntries: number
  averagePaymentTime: number
}

export type BillingTab = 'entries' | 'partial' | 'overdue' | 'settled'

export type DetailTab = 'overview' | 'products' | 'reconciliation' | 'comments'


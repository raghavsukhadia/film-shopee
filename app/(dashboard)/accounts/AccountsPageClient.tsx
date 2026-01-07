'use client'

import { useState, useEffect } from 'react'
import { DollarSign, FileText, TrendingUp, Eye, Download, Search, Calendar, User, Car, Package, MapPin, Building, AlertCircle, CheckCircle, Clock, Edit2, Save, X, Upload, Link as LinkIcon, FileImage, BarChart3, Filter, Percent, Users, Plus, Trash2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VehicleCommentsSection from '@/components/vehicles/VehicleCommentsSection'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/helpers/tenant-context'
import { exportToExcel, exportToExcelMultiSheet, formatCurrency, formatDate, type ExcelColumn } from '@/lib/services/excel-export'
import PaymentModal from '@/components/billing/PaymentModal'
import PaymentTimeline from '@/components/billing/PaymentTimeline'
import { logger } from '@/lib/utils/logger'
import { formatErrorForUser } from '@/lib/utils/errors'
import { useToast } from '@/components/ui/use-toast'

interface AccountEntry {
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
  invoiceNumber?: string // Invoice number from external platform
  // New billing fields
  billingStatus?: 'draft' | 'invoiced' | 'closed'
  invoiceDate?: string
  invoiceAmount?: number
  taxAmount?: number
  netPayable?: number
  dueDate?: string
  billingClosedAt?: string
  // Payment tracking
  payments?: Payment[]
  totalPaid?: number
  balanceDue?: number
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number?: string
  notes?: string
  created_at: string
}

interface ProductDetail {
  product: string
  brand: string
  price: number
  department: string
}

interface InvoiceReference {
  type: 'link' | 'file' | 'image'
  url: string
  fileName?: string
  uploadedAt?: string
}

export default function AccountsPageClient() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('entries')
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [completedEntries, setCompletedEntries] = useState<AccountEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [timeFilter, setTimeFilter] = useState<string>('all') // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [locationNames, setLocationNames] = useState<Map<string, string>>(new Map())
  const [vehicleTypeNames, setVehicleTypeNames] = useState<Map<string, string>>(new Map())
  const [managerNames, setManagerNames] = useState<Map<string, string>>(new Map())
  const [departmentNames, setDepartmentNames] = useState<Map<string, string>>(new Map())
  const [selectedEntry, setSelectedEntry] = useState<AccountEntry | null>(null)
  const [editingProducts, setEditingProducts] = useState(false)
  const [editedProducts, setEditedProducts] = useState<ProductDetail[]>([])
  const [savingProducts, setSavingProducts] = useState(false)
  const [invoiceLink, setInvoiceLink] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoiceReferences, setInvoiceReferences] = useState<InvoiceReference[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [userRole, setUserRole] = useState('accountant')
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountAmount, setDiscountAmount] = useState<string>('')
  const [discountOfferedBy, setDiscountOfferedBy] = useState<string>('')
  const [discountReason, setDiscountReason] = useState<string>('')
  const [savingDiscount, setSavingDiscount] = useState(false)
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('')
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(false)
  const [savingInvoiceNumber, setSavingInvoiceNumber] = useState(false)
  // Due date state
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateInput, setDueDateInput] = useState<string>('')
  const [savingDueDate, setSavingDueDate] = useState(false)
  // Payment-related state
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  // Billing stats
  const [billingStats, setBillingStats] = useState({
    totalEntries: 0,
    totalRevenue: 0,
    totalReceivable: 0,
    outstandingAmount: 0,
    partialPaymentsCount: 0,
    overdueEntries: 0,
    averagePaymentTime: 0
  })
  const [loadingStats, setLoadingStats] = useState(false)
  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sortColumn, setSortColumn] = useState<string>('installationCompleteDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  // Invoice reconciliation
  const [invoiceDateInput, setInvoiceDateInput] = useState<string>('')
  const [invoiceAmountInput, setInvoiceAmountInput] = useState<string>('')
  const [reconciliationNotes, setReconciliationNotes] = useState<string>('')
  const [editingReconciliation, setEditingReconciliation] = useState(false)
  const [savingReconciliation, setSavingReconciliation] = useState(false)
  // Ledger
  const [ledgerData, setLedgerData] = useState<any[]>([])
  const [loadingLedger, setLoadingLedger] = useState(false)
  // Detail view tab state
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'overview' | 'products' | 'invoice' | 'comments'>('details')
  // Responsive state
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadRelatedData()
    fetchAccountEntries()
    loadUserRole()
    if (activeTab === 'completed') {
      fetchCompletedEntries()
    }
    
    // Handle responsive sidebar
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [activeTab, timeFilter, customStartDate, customEndDate])

  useEffect(() => {
    if (selectedEntry) {
      setEditedProducts([...selectedEntry.products])
      setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
      setInvoiceDateInput(selectedEntry.invoiceDate || '')
      setInvoiceAmountInput(selectedEntry.invoiceAmount?.toString() || '')
      setDueDateInput(selectedEntry.dueDate ? new Date(selectedEntry.dueDate).toISOString().split('T')[0] : '')
      setEditingInvoiceNumber(false)
      setEditingReconciliation(false)
      setEditingDueDate(false)
      setActiveDetailTab('details') // Reset to details tab when new entry selected
      loadInvoiceReferences()
      loadPayments(selectedEntry.id)
      // If selectedEntry already has payments, use them to keep in sync
      if (selectedEntry.payments && Array.isArray(selectedEntry.payments) && selectedEntry.payments.length > 0) {
        setPayments(selectedEntry.payments)
      }
      // Load discount data for completed entries
      if (selectedEntry.status === 'completed') {
        setDiscountAmount(selectedEntry.discountAmount?.toString() || '')
        setDiscountOfferedBy(selectedEntry.discountOfferedBy || '')
        setDiscountReason(selectedEntry.discountReason || '')
      }
    } else {
      setPayments([])
    }
  }, [selectedEntry])

  useEffect(() => {
    // Always fetch billing stats for KPI cards
    fetchBillingStats()
    if (activeTab === 'ledger') {
      loadLedger('vehicle')
    }
  }, [activeTab])

  // Helper function to sync selectedEntry with updated entries list
  const syncSelectedEntry = async (updatedEntries?: AccountEntry[]) => {
    if (!selectedEntry) return
    
    // Use provided entries or current entries state
    const entriesToUse = updatedEntries || entries
    
    // Find the updated entry in the entries list
    const updatedEntry = entriesToUse.find(e => e.id === selectedEntry.id)
    if (updatedEntry) {
      // Fetch payments directly to get the latest data
      try {
        const response = await fetch(`/api/billing/entries/${updatedEntry.id}/payments`)
        const data = await response.json()
        const latestPayments = response.ok ? (data.payments || []) : []
        
        // Calculate payment totals
        const totalPaid = latestPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0)
        const netPayable = updatedEntry.netPayable || updatedEntry.finalAmount || updatedEntry.totalAmount || 0
        const balanceDue = netPayable - totalPaid
        
        // Update payments state
        setPayments(latestPayments)
        
        // Update selectedEntry with fresh data from the list and latest payments
        setSelectedEntry({
          ...updatedEntry,
          payments: latestPayments,
          totalPaid,
          balanceDue
        })
      } catch (error) {
        logger.error('Error syncing selectedEntry', error, 'AccountsPageClient')
        // Still update selectedEntry with entry data even if payments fetch fails
        setSelectedEntry(updatedEntry)
      }
    }
  }

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role || 'accountant')
        }
      }
    } catch (error) {
      logger.error('Error loading user role', error, 'AccountsPageClient')
    }
  }

  const loadInvoiceReferences = async () => {
    if (!selectedEntry) return
    try {
      // Load invoice references from comments with invoice tag or from a dedicated field
      // For now, we'll store invoice references as comments with a special format
      const { data: comments } = await supabase
        .from('vehicle_inward_comments')
        .select('*')
        .eq('vehicle_inward_id', selectedEntry.id)
        .like('comment', 'INVOICE_REF:%')
        .order('created_at', { ascending: false})
      
      if (comments && comments.length > 0) {
        // Get attachment IDs for these comments
        const commentIds = comments.map(c => c.id)
        const { data: attachments } = await supabase
          .from('vehicle_inward_comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
        
        const attachmentsMap: {[key: string]: any} = {}
        if (attachments) {
          attachments.forEach(att => {
            attachmentsMap[att.comment_id] = att
          })
        }
        
        const refs: InvoiceReference[] = comments.map(c => {
          const match = c.comment.match(/INVOICE_REF:(link|file|image):(.+)/)
          if (match) {
            const attachment = attachmentsMap[c.id]
            return {
              type: match[1] as 'link' | 'file' | 'image',
              url: attachment ? attachment.file_url : match[2],
              fileName: attachment ? attachment.file_name : match[2],
              uploadedAt: c.created_at
            }
          }
          return null
        }).filter(Boolean) as InvoiceReference[]
        setInvoiceReferences(refs)
      } else {
        setInvoiceReferences([])
      }
    } catch (error) {
      logger.error('Error loading invoice references', error, 'AccountsPageClient')
      setInvoiceReferences([])
    }
  }

  // Load payments for selected entry
  const loadPayments = async (entryId: string) => {
    try {
      setLoadingPayments(true)
      const response = await fetch(`/api/billing/entries/${entryId}/payments`)
      const data = await response.json()
      if (response.ok) {
        setPayments(data.payments || [])
      } else {
        logger.error('Error loading payments', data.error, 'AccountsPageClient')
        setPayments([])
      }
    } catch (error) {
      logger.error('Error loading payments', error, 'AccountsPageClient')
      setPayments([])
    } finally {
      setLoadingPayments(false)
    }
  }

  // Fetch billing statistics
  const fetchBillingStats = async () => {
    try {
      setLoadingStats(true)
      // Add cache-busting parameter to ensure fresh data
      // Send tenant ID in header as fallback for server-side session issues
      const tenantId = getCurrentTenantId()
      const response = await fetch(`/api/billing/stats?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
        cache: 'no-store'
      })
      
      // Check if response has content
      const contentType = response.headers.get('content-type')
      let data = {}
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (jsonError) {
          logger.error('[Accounts] Failed to parse JSON response', jsonError, 'AccountsPageClient')
          const text = await response.text()
          logger.error('[Accounts] Response text', { text }, 'AccountsPageClient')
          data = { error: 'Invalid JSON response', text }
        }
      } else {
        const text = await response.text()
        logger.error('[Accounts] Non-JSON response', { contentType, text }, 'AccountsPageClient')
        data = { error: 'Non-JSON response', text }
      }
      
      logger.debug('[Accounts] Billing stats API response', { 
        ok: response.ok, 
        status: response.status, 
        statusText: response.statusText,
        contentType
      }, 'AccountsPageClient')
      
      if (response.ok && !data.error) {
        logger.debug('[Accounts] Setting billing stats', data, 'AccountsPageClient')
        setBillingStats(data)
        logger.debug('[Accounts] Billing stats state updated', undefined, 'AccountsPageClient')
      } else {
        logger.error('[Accounts] Error in billing stats response', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          error: data.error,
          message: data.message,
          details: data.details
        }, 'AccountsPageClient')
        // Set zeros if there's an error to avoid showing stale data
        setBillingStats({
          totalEntries: 0,
          totalRevenue: 0,
          totalReceivable: 0,
          outstandingAmount: 0,
          partialPaymentsCount: 0,
          overdueEntries: 0,
          averagePaymentTime: 0
        })
      }
    } catch (error: any) {
      logger.error('[Accounts] Error fetching billing stats', error, 'AccountsPageClient')
      logger.error('[Accounts] Error details', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      // Set zeros on error
      setBillingStats({
        totalEntries: 0,
        totalRevenue: 0,
        totalReceivable: 0,
        outstandingAmount: 0,
        partialPaymentsCount: 0,
        overdueEntries: 0,
        averagePaymentTime: 0
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // Load ledger data
  const loadLedger = async (groupBy: 'vehicle' | 'customer' = 'vehicle') => {
    try {
      setLoadingLedger(true)
      const response = await fetch(`/api/billing/ledger?groupBy=${groupBy}`)
      const data = await response.json()
      if (response.ok) {
        setLedgerData(data.ledger || [])
      } else {
        logger.error('Error loading ledger', data.error, 'AccountsPageClient')
        setLedgerData([])
      }
    } catch (error) {
      logger.error('Error loading ledger', error, 'AccountsPageClient')
      setLedgerData([])
    } finally {
      setLoadingLedger(false)
    }
  }

  // Handle payment added
  const handlePaymentAdded = async () => {
    if (selectedEntry) {
      // Fetch updated payments data immediately
      const response = await fetch(`/api/billing/entries/${selectedEntry.id}/payments`)
      const data = await response.json()
      
      if (response.ok) {
        const updatedPayments = data.payments || []
        // Calculate total paid with validation
        const totalPaid = updatedPayments.reduce((sum: number, p: Payment) => {
          const amount = parseFloat(p.amount?.toString() || '0')
          return sum + (isNaN(amount) ? 0 : Math.max(0, amount))
        }, 0)
        const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
        const balanceDue = Math.max(0, netPayable - totalPaid) // Ensure balance due is never negative
        
        // Update payments state first
        setPayments(updatedPayments)
        
        // Update selectedEntry with functional update to ensure we have latest state
        setSelectedEntry(prev => {
          if (!prev) return prev
          return {
            ...prev,
            payments: updatedPayments,
            totalPaid: Math.max(0, totalPaid), // Ensure totalPaid is never negative
            balanceDue
          }
        })
        
        // Also reload payments to ensure consistency
        await loadPayments(selectedEntry.id)
      }
      
      // Refresh account entries first to get latest data
      const updatedEntries = await fetchAccountEntries()
      
      // Sync selectedEntry with updated entries to reflect payment changes
      await syncSelectedEntry(updatedEntries)
      
      // Check if entry should move to Partial Payment tab (has partial payment)
      const entryInUpdatedList = updatedEntries.find(e => e.id === selectedEntry.id)
      if (entryInUpdatedList) {
        const hasPartialPayment = (entryInUpdatedList.totalPaid || 0) > 0 && (entryInUpdatedList.balanceDue || 0) > 0.01
        
        // Auto-set due date if partial payment exists and due date is not set
        if (hasPartialPayment && !entryInUpdatedList.dueDate) {
          try {
            const oneMonthLater = new Date()
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
            const dueDateISO = oneMonthLater.toISOString()
            
            const tenantId = getCurrentTenantId()
            const isSuper = isSuperAdmin()
            
            let updateQuery = supabase
              .from('vehicle_inward')
              .update({ due_date: dueDateISO })
              .eq('id', selectedEntry.id)
            
            if (!isSuper && tenantId) {
              updateQuery = updateQuery.eq('tenant_id', tenantId)
            }
            
            const { error: dueDateError } = await updateQuery
            
            if (dueDateError) {
              logger.error('Error setting due date', dueDateError, 'AccountsPageClient')
            } else {
              // Update selectedEntry with new due date
              setSelectedEntry(prev => prev ? { ...prev, dueDate: dueDateISO } : prev)
            }
          } catch (error) {
            logger.error('Error auto-setting due date', error, 'AccountsPageClient')
          }
        }
        
        if (hasPartialPayment && activeTab === 'entries') {
          // Entry now has partial payment, should be in Partial Payment tab
          // Optionally switch to Partial Payment tab, or just let user see it's moved
          // For now, we'll just refresh - the entry will disappear from Billing Entries tab
        }
      }
      
      // Longer delay to ensure backend has processed all payment changes and database is consistent
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Refresh billing stats after entries are fully refreshed and database is consistent
      await fetchBillingStats()
    }
  }

  // Handle close entry
  const handleCloseEntry = async () => {
    if (!selectedEntry) return
    if (!confirm('Are you sure you want to close this billing entry? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/billing/entries/${selectedEntry.id}/close`, {
        method: 'POST'
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Entry closed successfully!',
          variant: 'default'
        })
        await fetchAccountEntries()
        if (activeTab === 'completed') {
          await fetchCompletedEntries()
        }
        setSelectedEntry(null)
      } else {
        toast({
          title: 'Error',
          description: `Failed to close entry: ${data.error}`,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      logger.error('Error closing entry', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to close entry: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Handle delete payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedEntry) return
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const response = await fetch(`/api/billing/entries/${selectedEntry.id}/payments?paymentId=${paymentId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (response.ok) {
        await handlePaymentAdded()
      } else {
        toast({
          title: 'Error',
          description: `Failed to delete payment: ${data.error}`,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      logger.error('Error deleting payment', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to delete payment: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // Handle save reconciliation
  const handleSaveReconciliation = async () => {
    if (!selectedEntry) return

    try {
      setSavingReconciliation(true)
      const response = await fetch(`/api/billing/entries/${selectedEntry.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invoiceNumberInput,
          invoice_date: invoiceDateInput || null,
          invoice_amount: invoiceAmountInput ? parseFloat(invoiceAmountInput) : null,
          reconciliation_notes: reconciliationNotes || null
        })
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Reconciliation data saved successfully!',
          variant: 'default'
        })
        setEditingReconciliation(false)
        const updatedEntries = await fetchAccountEntries()
        await syncSelectedEntry(updatedEntries)
      } else {
        toast({
          title: 'Error',
          description: `Failed to save reconciliation: ${data.error}`,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      logger.error('Error saving reconciliation', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to save reconciliation: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setSavingReconciliation(false)
    }
  }

  // Handle save due date
  const handleSaveDueDate = async () => {
    if (!selectedEntry) return

    try {
      setSavingDueDate(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ due_date: dueDateInput || null })
        .eq('id', selectedEntry.id)
      
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery
      
      if (error) {
        toast({
          title: 'Error',
          description: `Failed to save due date: ${error.message}`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Success',
          description: 'Due date saved successfully!',
          variant: 'default'
        })
        setEditingDueDate(false)
        const updatedEntries = await fetchAccountEntries()
        await syncSelectedEntry(updatedEntries)
      }
    } catch (error: any) {
      logger.error('Error saving due date', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to save due date: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setSavingDueDate(false)
    }
  }

  const loadRelatedData = async () => {
    try {
      // Fetch locations
      const { data: locations } = await supabase.from('locations').select('id, name')
      if (locations) {
        setLocationNames(new Map(locations.map(loc => [loc.id, loc.name])))
      }

      // Fetch vehicle types
      const { data: vehicleTypes } = await supabase.from('vehicle_types').select('id, name')
      if (vehicleTypes) {
        setVehicleTypeNames(new Map(vehicleTypes.map(vt => [vt.id, vt.name])))
      }

      // Fetch managers
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'manager')
      if (managers) {
        setManagerNames(new Map(managers.map(mgr => [mgr.id, mgr.name])))
      }

      // Fetch departments
      const { data: departments } = await supabase.from('departments').select('id, name')
      if (departments) {
        setDepartmentNames(new Map(departments.map(dept => [dept.id, dept.name])))
      }
    } catch (error) {
      logger.error('Error loading related data', error, 'AccountsPageClient')
    }
  }

  const fetchCompletedEntries = async () => {
    try {
      setCompletedLoading(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Fetch vehicles that are finished from operations perspective and should remain in Accounts history
      // Includes: completed, complete_and_delivered, delivered variants
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .in('status', ['completed', 'complete_and_delivered', 'delivered', 'delivered_final', 'delivered (final)'])
        .order('created_at', { ascending: true })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      // Apply time filter
      let startDate: Date | null = null
      const now = new Date()
      
      switch (timeFilter) {
        case 'today': {
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          startDate = today
          break
        }
        case 'week': {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          startDate = weekAgo
          break
        }
        case 'month': {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          startDate = monthAgo
          break
        }
        case 'year': {
          const yearAgo = new Date(now)
          yearAgo.setFullYear(yearAgo.getFullYear() - 1)
          startDate = yearAgo
          break
        }
        case 'custom':
          if (customStartDate) {
            startDate = new Date(customStartDate)
          }
          break
      }

      if (startDate) {
        query = query.gte('updated_at', startDate.toISOString())
      }

      if (timeFilter === 'custom' && customEndDate) {
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('updated_at', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        // Generate sequential IDs based on index (Z01, Z02, Z03, etc.)
        // Sort by created_at ascending to maintain sequential order
        const sortedData = [...data].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        const mappedEntries: AccountEntry[] = sortedData.map((v: any, index: number) => {
          // Parse products from accessories_requested JSON
          let products: ProductDetail[] = []
          let totalAmount = 0

          if (v.accessories_requested) {
            try {
              const parsed = JSON.parse(v.accessories_requested)
              if (Array.isArray(parsed)) {
                products = parsed.map((p: any) => {
                  const price = parseFloat(p.price || 0)
                  totalAmount += price
                  return {
                    product: p.product || '',
                    brand: p.brand || '',
                    price: price,
                    department: p.department || ''
                  }
                })
              }
            } catch {
              // If parsing fails, keep empty products
            }
          }

          // Get discount data and invoice number from notes field (stored as JSON)
          let discountAmount = 0
          let discountPercentage = 0
          let discountOfferedBy = ''
          let discountReason = ''
          let invoiceNumber = ''
          
          if (v.notes) {
            try {
              const notesData = JSON.parse(v.notes)
              if (notesData.discount) {
                discountAmount = parseFloat(notesData.discount.discount_amount || 0)
                discountPercentage = notesData.discount.discount_percentage || (totalAmount > 0 ? (discountAmount / totalAmount) * 100 : 0)
                discountOfferedBy = notesData.discount.discount_offered_by || ''
                discountReason = notesData.discount.discount_reason || ''
              }
              // Get invoice number from notes
              if (notesData.invoice_number) {
                invoiceNumber = notesData.invoice_number
              }
            } catch {
              // If parsing fails, check if there's a direct discount_amount column
              discountAmount = parseFloat(v.discount_amount || 0)
              if (discountAmount > 0 && totalAmount > 0) {
                discountPercentage = (discountAmount / totalAmount) * 100
              }
            }
          } else {
            // Fallback to direct column if exists
            discountAmount = parseFloat(v.discount_amount || 0)
            if (discountAmount > 0 && totalAmount > 0) {
              discountPercentage = (discountAmount / totalAmount) * 100
            }
            discountOfferedBy = v.discount_offered_by || v.discount_offered_by_name || ''
            discountReason = v.discount_reason || ''
          }
          
          const finalAmount = totalAmount - discountAmount

          return {
            id: v.id,
            shortId: `Z${String(index + 1).padStart(2, '0')}`, // Generate sequential ID: Z01, Z02, Z03, etc.
            customerName: v.customer_name || 'N/A',
            customerPhone: v.customer_phone || 'N/A',
            customerEmail: v.customer_email,
            vehicleNumber: v.registration_number || 'N/A',
            model: v.model || 'N/A',
            make: v.make || 'Unknown',
            year: v.year,
            color: v.color,
            vehicleType: v.vehicle_type,
            location: v.location_id,
            manager: v.assigned_manager_id,
            installationCompleteDate: v.updated_at || v.created_at,
            expectedDelivery: v.estimated_completion_date,
            products: products,
            totalAmount: totalAmount,
            status: v.status,
            created_at: v.created_at,
            completed_at: v.updated_at,
            discountAmount: discountAmount,
            discountPercentage: discountPercentage,
            discountOfferedBy: discountOfferedBy,
            discountReason: discountReason,
            finalAmount: finalAmount,
            invoiceNumber: invoiceNumber
          }
        })

        setCompletedEntries(mappedEntries)
      } else {
        setCompletedEntries([])
      }
    } catch (error) {
      logger.error('Error fetching completed entries', error, 'AccountsPageClient')
      setCompletedEntries([])
    } finally {
      setCompletedLoading(false)
    }
  }

  // Helper function to map vehicle data to AccountEntry
  const mapVehicleToAccountEntry = (v: any): AccountEntry => {
    // Parse products from accessories_requested JSON
    let products: ProductDetail[] = []
    let totalAmount = 0

    if (v.accessories_requested) {
      try {
        const parsed = JSON.parse(v.accessories_requested)
        if (Array.isArray(parsed)) {
          products = parsed.map((p: any) => {
            const price = parseFloat(p.price || 0)
            totalAmount += price
            return {
              product: p.product || '',
              brand: p.brand || '',
              price: price,
              department: p.department || ''
            }
          })
        }
      } catch {
        // If parsing fails, keep empty products
      }
    }

    // Get invoice number and discount info from notes field
    let invoiceNumber = ''
    let discountAmount = 0
    let discountPercentage = 0
    let discountOfferedBy = ''
    let discountReason = ''
    
    if (v.notes) {
      try {
        const notesData = JSON.parse(v.notes)
        if (notesData.invoice_number) {
          invoiceNumber = notesData.invoice_number
        }
        if (notesData.discount) {
          discountAmount = parseFloat(notesData.discount.discount_amount || 0)
          discountPercentage = parseFloat(notesData.discount.discount_percentage || 0)
          discountOfferedBy = notesData.discount.discount_offered_by || ''
          discountReason = notesData.discount.discount_reason || ''
        }
      } catch {
        // If parsing fails, values remain empty/zero
      }
    }

    // Calculate net payable (totalAmount - discountAmount + taxAmount)
    const taxAmount = parseFloat(v.tax_amount || 0)
    const netPayable = totalAmount - discountAmount + taxAmount

    // Note: shortId will be set by the calling function based on index
    return {
      id: v.id,
      shortId: v.short_id || v.id.substring(0, 8), // Will be overridden with sequential ID
      customerName: v.customer_name || 'N/A',
      customerPhone: v.customer_phone || 'N/A',
      customerEmail: v.customer_email,
      vehicleNumber: v.registration_number || 'N/A',
      model: v.model || 'N/A',
      make: v.make || 'Unknown',
      year: v.year,
      color: v.color,
      vehicleType: v.vehicle_type,
      location: v.location_id,
      manager: v.assigned_manager_id,
      installationCompleteDate: v.updated_at || v.created_at,
      expectedDelivery: v.estimated_completion_date,
      products: products,
      totalAmount: totalAmount,
      status: v.status,
      created_at: v.created_at,
      invoiceNumber: v.invoice_number || invoiceNumber,
      discountAmount: discountAmount,
      discountPercentage: discountPercentage,
      discountOfferedBy: discountOfferedBy,
      discountReason: discountReason,
      finalAmount: totalAmount - discountAmount,
      // New billing fields
      billingStatus: (v.billing_status as 'draft' | 'invoiced' | 'closed') || 'draft',
      invoiceDate: v.invoice_date,
      invoiceAmount: v.invoice_amount ? parseFloat(v.invoice_amount) : undefined,
      taxAmount: taxAmount,
      netPayable: v.net_payable ? parseFloat(v.net_payable) : netPayable,
      dueDate: v.due_date,
      billingClosedAt: v.billing_closed_at
    }
  }

  const fetchAccountEntries = async (): Promise<AccountEntry[]> => {
    try {
      setLoading(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Fetch ALL vehicles from the moment they are created (vehicle inward)
      // Exclude only final/delivered statuses - show all active vehicles for invoicing
      // This allows accountants to see and work on entries immediately after vehicle inward
      // Sort by created_at ascending to maintain sequential ID order (Z01, Z02, etc.)
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .not('status', 'in', '(completed,complete_and_delivered,delivered,delivered_final)')
        .order('created_at', { ascending: true })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        logger.error('Error fetching account entries', error, 'AccountsPageClient')
        setEntries([])
        setLoading(false)
        return []
      }

      if (data && data.length > 0) {
        // Fetch payment data for all entries to calculate balance due
        const entryIds = data.map((v: any) => v.id)
        let paymentsQuery = supabase
          .from('payments')
          .select('vehicle_inward_id, amount')
          .in('vehicle_inward_id', entryIds)
        
        // Add tenant filter for payments to ensure tenant isolation
        // Payments should be filtered by the tenant_id of the vehicle_inward entries
        // Since we already filtered entries by tenant_id, payments for those entries are implicitly tenant-isolated
        // However, we add an explicit check for security
        const { data: paymentsData, error: paymentsError } = await paymentsQuery
        
        if (paymentsError) {
          logger.error('Error fetching payments for entries', paymentsError, 'AccountsPageClient')
          // Continue without payment data rather than failing completely
        }
        
        // Group payments by entry ID
        // Only include payments for entries that belong to this tenant (security check)
        const validEntryIds = new Set(data.map((v: any) => v.id))
        const paymentsByEntry: { [key: string]: number } = {}
        paymentsData?.forEach((p: any) => {
          // Security: Only process payments for entries we fetched (tenant-isolated)
          if (validEntryIds.has(p.vehicle_inward_id)) {
            const entryId = p.vehicle_inward_id
            const amount = parseFloat(p.amount?.toString() || '0')
            if (!isNaN(amount) && amount > 0) {
              paymentsByEntry[entryId] = (paymentsByEntry[entryId] || 0) + amount
            }
          }
        })
        
        // Generate sequential IDs based on index (Z01, Z02, Z03, etc.)
        // Data is already sorted by created_at ascending
        const mappedEntries: AccountEntry[] = data.map((v: any, index: number) => {
          const entry = mapVehicleToAccountEntry(v)
          // Generate sequential ID: Z01, Z02, Z03, etc.
          entry.shortId = `Z${String(index + 1).padStart(2, '0')}`
          
          // Calculate payment totals for this entry
          const totalPaid = paymentsByEntry[entry.id] || 0
          const netPayable = entry.netPayable || entry.finalAmount || entry.totalAmount || 0
          const balanceDue = Math.max(0, netPayable - totalPaid) // Ensure balance due is never negative
          
          // Add payment data to entry with validation
          entry.totalPaid = Math.max(0, totalPaid) // Ensure totalPaid is never negative
          entry.balanceDue = balanceDue
          
          return entry
        })
        logger.info(`Fetched ${mappedEntries.length} account entries (all active vehicles)`, undefined, 'AccountsPageClient')
        setEntries(mappedEntries)
        return mappedEntries
      } else {
        logger.info('No active vehicles found', undefined, 'AccountsPageClient')
        setEntries([])
        return []
      }
    } catch (error) {
      logger.error('Error fetching account entries', error, 'AccountsPageClient')
      setEntries([])
      return []
    } finally {
      setLoading(false)
    }
  }

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  // Sort entries function
  const sortEntries = (entriesToSort: AccountEntry[], column: string, direction: 'asc' | 'desc'): AccountEntry[] => {
    return [...entriesToSort].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (column) {
        case 'shortId':
          aValue = a.shortId || a.id
          bValue = b.shortId || b.id
          break
        case 'customerName':
          aValue = a.customerName.toLowerCase()
          bValue = b.customerName.toLowerCase()
          break
        case 'vehicleNumber':
          aValue = a.vehicleNumber.toLowerCase()
          bValue = b.vehicleNumber.toLowerCase()
          break
        case 'netPayable':
          aValue = a.netPayable ?? a.finalAmount ?? a.totalAmount ?? 0
          bValue = b.netPayable ?? b.finalAmount ?? b.totalAmount ?? 0
          break
        case 'totalAmount':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
          break
        case 'installationCompleteDate':
          aValue = a.installationCompleteDate ? new Date(a.installationCompleteDate).getTime() : 0
          bValue = b.installationCompleteDate ? new Date(b.installationCompleteDate).getTime() : 0
          break
        case 'completed_at':
          aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0
          bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0
          break
        case 'balanceDue':
          aValue = a.balanceDue ?? (a.netPayable ?? a.finalAmount ?? a.totalAmount ?? 0) - (a.totalPaid ?? 0)
          bValue = b.balanceDue ?? (b.netPayable ?? b.finalAmount ?? b.totalAmount ?? 0) - (b.totalPaid ?? 0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Calculate summary statistics for entries
  const filteredEntries = entries.filter(entry => {
    // Exclude entries with partial payments (they should appear in "Partial Payment" tab)
    const hasPartialPayment = (entry.totalPaid || 0) > 0 && (entry.balanceDue || 0) > 0.01
    if (hasPartialPayment) {
      return false
    }
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
    
    return matchesSearch
  })

  // Filter entries with partial payments (for Partial Payment tab)
  const partialPaymentEntries = entries.filter(entry => {
    // Include only entries with partial payments (totalPaid > 0 && balanceDue > 0.01)
    const hasPartialPayment = (entry.totalPaid || 0) > 0 && (entry.balanceDue || 0) > 0.01
    if (!hasPartialPayment) {
      return false
    }
    
    // Exclude overdue entries (they should appear in Overdue tab)
    const isOverdue = entry.dueDate && (entry.balanceDue || 0) > 0.01 && new Date(entry.dueDate) < new Date()
    if (isOverdue) {
      return false
    }
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
    
    return matchesSearch
  })

  // Sort filtered entries
  const sortedEntries = sortEntries(filteredEntries, sortColumn, sortDirection)
  const sortedPartialPayments = sortEntries(partialPaymentEntries, sortColumn, sortDirection)

  const totalEntries = filteredEntries.length
  const totalRevenue = filteredEntries.reduce((sum, entry) => sum + entry.totalAmount, 0)
  const avgOrderValue = totalEntries > 0 ? totalRevenue / totalEntries : 0

  // Pagination calculations
  const getPaginatedData = (data: AccountEntry[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: AccountEntry[]) => {
    return Math.ceil(data.length / itemsPerPage)
  }

  // Reset to first page when search term or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  // Helper function to render sortable header
  const renderSortableHeader = (column: string, label: string) => {
    const isActive = sortColumn === column
    return (
      <th
        onClick={() => handleSort(column)}
        style={{
          padding: '0.75rem 1rem',
          textAlign: 'left',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isActive ? '#f1f5f9' : 'transparent',
          borderBottom: '2px solid #e2e8f0',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = '#f9fafb'
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {label}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb' }} />
            ) : (
              <ArrowDown style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb' }} />
            )
          ) : (
            <div style={{ width: '0.875rem', height: '0.875rem', opacity: 0.3 }}>
              <ArrowUp style={{ width: '0.875rem', height: '0.875rem' }} />
            </div>
          )}
        </div>
      </th>
    )
  }

  // Pagination component
  const PaginationControls = ({ totalItems, currentData }: { totalItems: number, currentData: AccountEntry[] }) => {
    const totalPages = getTotalPages(currentData)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    const startItem = totalItems > 0 ? startIndex + 1 : 0

    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      const maxVisible = 7
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 5; i++) pages.push(i)
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
          pages.push('...')
          pages.push(totalPages)
        }
      }
      return pages
    }

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing {startItem}-{endIndex} of {totalItems} entries
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              color: currentPage === 1 ? '#9ca3af' : '#374151',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
            Previous
          </button>
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} style={{ padding: '0.5rem', color: '#64748b' }}>...</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page as number)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  backgroundColor: currentPage === page ? '#2563eb' : 'white',
                  color: currentPage === page ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: currentPage === page ? '600' : '400',
                  minWidth: '2.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = 'white'
                  }
                }}
              >
                {page}
              </button>
            )
          ))}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              color: currentPage === totalPages ? '#9ca3af' : '#374151',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
          >
            Next
            <ChevronRight style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>
      </div>
    )
  }

  // Filter overdue entries
  const filteredOverdue = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
    
    const balanceDue = entry.balanceDue ?? (entry.netPayable ?? entry.finalAmount ?? entry.totalAmount ?? 0) - (entry.totalPaid ?? 0)
    const isOverdue = entry.dueDate && balanceDue > 0.01 && new Date(entry.dueDate) < new Date()
    
    return matchesSearch && isOverdue
  })

  // Sort overdue entries
  const sortedOverdue = sortEntries(filteredOverdue, sortColumn, sortDirection)

  // Calculate analytics for completed entries
  const filteredCompleted = completedEntries.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
    
    return matchesSearch
  })

  // Sort completed entries
  const sortedCompleted = sortEntries(filteredCompleted, sortColumn, sortDirection)

  const completedTotal = filteredCompleted.length
  const completedRevenue = filteredCompleted.reduce((sum, entry) => sum + (entry.finalAmount || entry.totalAmount), 0)
  const completedOriginalRevenue = filteredCompleted.reduce((sum, entry) => sum + entry.totalAmount, 0)
  const totalDiscountsGiven = filteredCompleted.reduce((sum, entry) => sum + (entry.discountAmount || 0), 0)
  const avgDiscount = completedTotal > 0 ? totalDiscountsGiven / completedTotal : 0
  const avgDiscountPercentage = completedOriginalRevenue > 0 ? (totalDiscountsGiven / completedOriginalRevenue) * 100 : 0
  const avgCompletedOrderValue = completedTotal > 0 ? completedRevenue / completedTotal : 0
  const entriesWithDiscount = filteredCompleted.filter(e => (e.discountAmount || 0) > 0).length
  const discountRatio = completedTotal > 0 ? (entriesWithDiscount / completedTotal) * 100 : 0

  // Dynamic summary stats based on active tab
  const displayTotalEntries = activeTab === 'completed' ? completedTotal : totalEntries
  const displayTotalRevenue = activeTab === 'completed' ? completedRevenue : totalRevenue
  const displayAvgOrderValue = activeTab === 'completed' ? avgCompletedOrderValue : avgOrderValue

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const generateCSV = (entries: AccountEntry[]): string => {
    const headers = [
      'Entry ID',
      'Customer Name',
      'Phone',
      'Email',
      'Vehicle Number',
      'Model',
      'Make',
      'Year',
      'Color',
      'Vehicle Type',
      'Location',
      'Manager',
      'Installation Complete Date',
      'Expected Delivery',
      'Product Details',
      'Total Amount'
    ]

    const rows = entries.map(entry => {
      const productsText = entry.products.map(p => `${p.product} (${p.brand}) - ${formatCurrency(p.price)}`).join('; ')
      return [
        entry.shortId || entry.id.substring(0, 8),
        entry.customerName,
        entry.customerPhone,
        entry.customerEmail || '',
        entry.vehicleNumber,
        entry.model,
        entry.make,
        entry.year?.toString() || '',
        entry.color || '',
        entry.vehicleType ? (vehicleTypeNames.get(entry.vehicleType) || entry.vehicleType) : '',
        entry.location ? (locationNames.get(entry.location) || entry.location) : '',
        entry.manager ? (managerNames.get(entry.manager) || entry.manager) : '',
        formatDate(entry.installationCompleteDate),
        entry.expectedDelivery ? new Date(entry.expectedDelivery).toLocaleDateString('en-IN') : '',
        productsText,
        entry.totalAmount.toString()
      ]
    })

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const generateEntryCSV = (entry: AccountEntry): string => {
    const headers = ['Product', 'Brand', 'Department', 'Price']
    const rows = entry.products.map(product => [
      product.product,
      product.brand,
      departmentNames.get(product.department) || product.department,
      product.price.toString()
    ])

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const generateCompletedCSV = (entries: AccountEntry[]): string => {
    const headers = [
      'Entry ID',
      'Customer Name',
      'Phone',
      'Email',
      'Vehicle Number',
      'Model',
      'Make',
      'Location',
      'Manager',
      'Completed Date',
      'Original Amount',
      'Discount Amount',
      'Discount %',
      'Discount Offered By',
      'Discount Reason',
      'Final Amount',
      'Product Count'
    ]

    const rows = entries.map(entry => [
      entry.shortId || entry.id.substring(0, 8),
      entry.customerName,
      entry.customerPhone,
      entry.customerEmail || '',
      entry.vehicleNumber,
      entry.model,
      entry.make,
      entry.location ? (locationNames.get(entry.location) || entry.location) : '',
      entry.manager ? (managerNames.get(entry.manager) || entry.manager) : '',
      entry.completed_at ? formatDate(entry.completed_at) : '',
      entry.totalAmount.toString(),
      (entry.discountAmount || 0).toString(),
      (entry.discountPercentage || 0).toFixed(2),
      entry.discountOfferedBy || '',
      entry.discountReason || '',
      (entry.finalAmount || entry.totalAmount).toString(),
      entry.products.length.toString()
    ])

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportToExcel = () => {
    try {
      const dataToExport = activeTab === 'completed' ? filteredCompleted : entries

      if (dataToExport.length === 0) {
        toast({
          title: 'No Data',
          description: 'No entries to export. Please ensure there are entries in the current view.',
          variant: 'default'
        })
        return
      }

      if (activeTab === 'completed') {
        // Export completed entries with discount information
        const columns: ExcelColumn[] = [
          { header: 'Entry ID', key: 'shortId', width: 12 },
          { header: 'Customer Name', key: 'customerName', width: 20 },
          { header: 'Phone', key: 'customerPhone', width: 15 },
          { header: 'Email', key: 'customerEmail', width: 25 },
          { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
          { header: 'Model', key: 'model', width: 20 },
          { header: 'Make', key: 'make', width: 15 },
          { header: 'Year', key: 'year', width: 8 },
          { header: 'Color', key: 'color', width: 12 },
          { header: 'Location', key: 'location', width: 20, format: (v) => v ? (locationNames.get(v) || v) : '' },
          { header: 'Manager', key: 'manager', width: 20, format: (v) => v ? (managerNames.get(v) || v) : '' },
          { header: 'Completed Date', key: 'completed_at', width: 18, format: (v) => formatDate(v) },
          { header: 'Original Amount', key: 'totalAmount', width: 15, format: (v) => formatCurrency(v) },
          { header: 'Discount Amount', key: 'discountAmount', width: 15, format: (v) => formatCurrency(v || 0) },
          { header: 'Discount %', key: 'discountPercentage', width: 12, format: (v) => v ? `${v.toFixed(2)}%` : '0%' },
          { header: 'Discount Offered By', key: 'discountOfferedBy', width: 20 },
          { header: 'Discount Reason', key: 'discountReason', width: 30 },
          { header: 'Final Amount', key: 'finalAmount', width: 15, format: (v, entry) => formatCurrency(entry.finalAmount || entry.totalAmount) },
          { header: 'Product Count', key: 'products', width: 12, format: (v) => v ? v.length.toString() : '0' },
          { header: 'Invoice Number', key: 'invoiceNumber', width: 18 }
        ]

        exportToExcel({
          filename: `completed_accounts_export_${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Completed Entries',
          title: 'Completed Account Entries Export',
          subtitle: `Total Entries: ${dataToExport.length} | Period: ${timeFilter === 'all' ? 'All Time' : timeFilter}`,
          columns,
          data: dataToExport,
          includeDate: true
        })
      } else {
        // Export active entries with product details
        const columns: ExcelColumn[] = [
          { header: 'Entry ID', key: 'shortId', width: 12 },
          { header: 'Customer Name', key: 'customerName', width: 20 },
          { header: 'Phone', key: 'customerPhone', width: 15 },
          { header: 'Email', key: 'customerEmail', width: 25 },
          { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
          { header: 'Model', key: 'model', width: 20 },
          { header: 'Make', key: 'make', width: 15 },
          { header: 'Year', key: 'year', width: 8 },
          { header: 'Color', key: 'color', width: 12 },
          { header: 'Vehicle Type', key: 'vehicleType', width: 18, format: (v) => v ? (vehicleTypeNames.get(v) || v) : '' },
          { header: 'Location', key: 'location', width: 20, format: (v) => v ? (locationNames.get(v) || v) : '' },
          { header: 'Manager', key: 'manager', width: 20, format: (v) => v ? (managerNames.get(v) || v) : '' },
          { header: 'Installation Complete Date', key: 'installationCompleteDate', width: 22, format: (v) => formatDate(v) },
          { header: 'Expected Delivery', key: 'expectedDelivery', width: 18, format: (v) => v ? formatDate(v) : '' },
          { header: 'Product Count', key: 'products', width: 12, format: (v) => v ? v.length.toString() : '0' },
          { header: 'Total Amount', key: 'totalAmount', width: 15, format: (v) => formatCurrency(v) },
          { header: 'Status', key: 'status', width: 15 }
        ]

        // Create main sheet with summary
        exportToExcel({
          filename: `account_entries_export_${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Account Entries',
          title: 'Account Entries Export',
          subtitle: `Total Entries: ${dataToExport.length}`,
          columns,
          data: dataToExport,
          includeDate: true
        })

        // Also create a detailed sheet with product breakdown if there are entries
        if (dataToExport.length > 0 && dataToExport.length <= 50) {
          // For smaller datasets, create a detailed sheet with products
          const productRows: any[] = []
          dataToExport.forEach(entry => {
            if (entry.products && entry.products.length > 0) {
              entry.products.forEach((product: any) => {
                productRows.push({
                  entryId: entry.shortId || entry.id.substring(0, 8),
                  customerName: entry.customerName,
                  vehicleNumber: entry.vehicleNumber,
                  product: product.product,
                  brand: product.brand,
                  department: departmentNames.get(product.department) || product.department,
                  price: formatCurrency(product.price)
                })
              })
            } else {
              productRows.push({
                entryId: entry.shortId || entry.id.substring(0, 8),
                customerName: entry.customerName,
                vehicleNumber: entry.vehicleNumber,
                product: 'No products',
                brand: '',
                department: '',
                price: ''
              })
            }
          })

          if (productRows.length > 0) {
            exportToExcelMultiSheet(
              `account_entries_detailed_${new Date().toISOString().split('T')[0]}`,
              [
                {
                  name: 'Summary',
                  title: 'Account Entries Summary',
                  subtitle: `Total Entries: ${dataToExport.length}`,
                  columns,
                  data: dataToExport
                },
                {
                  name: 'Product Details',
                  title: 'Product Breakdown',
                  columns: [
                    { header: 'Entry ID', key: 'entryId', width: 12 },
                    { header: 'Customer Name', key: 'customerName', width: 20 },
                    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
                    { header: 'Product', key: 'product', width: 25 },
                    { header: 'Brand', key: 'brand', width: 20 },
                    { header: 'Department', key: 'department', width: 20 },
                    { header: 'Price', key: 'price', width: 15 }
                  ],
                  data: productRows
                }
              ]
            )
            return // Exit early since we already exported
          }
        }
      }

      toast({
        title: 'Success',
        description: `Successfully exported ${dataToExport.length} entry/entries to Excel!`,
        variant: 'default'
      })
    } catch (error: any) {
      logger.error('Error exporting to Excel', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to export: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  const handleEditProducts = () => {
    setEditingProducts(true)
    setEditedProducts([...selectedEntry!.products])
  }

  const handleCancelEdit = () => {
    setEditingProducts(false)
    if (selectedEntry) {
      setEditedProducts([...selectedEntry.products])
    }
  }

  const handleProductChange = (index: number, field: keyof ProductDetail, value: string | number) => {
    const updated = [...editedProducts]
    updated[index] = { ...updated[index], [field]: value }
    setEditedProducts(updated)
  }

  const handleSaveProducts = async () => {
    if (!selectedEntry) return
    
    try {
      setSavingProducts(true)
      // Update accessories_requested in vehicle_inward
      const updatedProducts = JSON.stringify(editedProducts)
      
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ accessories_requested: updatedProducts })
        .eq('id', selectedEntry.id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery

      if (error) throw error

      // Recalculate total
      const newTotal = editedProducts.reduce((sum, p) => sum + p.price, 0)
      
      // Update entry in state
      const updatedEntry = {
        ...selectedEntry,
        products: editedProducts,
        totalAmount: newTotal
      }
      setSelectedEntry(updatedEntry)
      
      // Update entry in entries list
      setEntries(entries.map(e => e.id === selectedEntry.id ? updatedEntry : e))
      
      setEditingProducts(false)
      toast({
        title: 'Success',
        description: 'Product details updated successfully!',
        variant: 'default'
      })
      const updatedEntries = await fetchAccountEntries()
      await syncSelectedEntry(updatedEntries)
    } catch (error: any) {
      logger.error('Error saving products', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to save products: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setSavingProducts(false)
    }
  }

  const handleAddInvoiceLink = async () => {
    if (!invoiceLink.trim() || !selectedEntry) return
    
    try {
      setInvoiceLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to add invoice links',
          variant: 'destructive'
        })
        return
      }

      // Get tenant_id - required for RLS policy
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // If tenant_id is missing, fetch it from database
      let effectiveTenantId = tenantId
      if (!isSuper && !effectiveTenantId) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        if (tenantUser?.tenant_id) {
          effectiveTenantId = tenantUser.tenant_id
          sessionStorage.setItem('current_tenant_id', effectiveTenantId)
        }
      }

      // Prepare comment data with tenant_id
      const commentData: any = {
        vehicle_inward_id: selectedEntry.id,
        comment: `INVOICE_REF:link:${invoiceLink}`,
        created_by: user.email || user.id || 'accountant',
        role: userRole || 'accountant'
      }

      // Add tenant_id if available (super admins can have null tenant_id)
      if (!isSuper && effectiveTenantId) {
        commentData.tenant_id = effectiveTenantId
      }
      
      // Create a comment as invoice reference
      const { error } = await supabase
        .from('vehicle_inward_comments')
        .insert(commentData)

      if (error) throw error

      setInvoiceLink('')
      await loadInvoiceReferences()
      toast({
        title: 'Success',
        description: 'Invoice link added successfully!',
        variant: 'default'
      })
    } catch (error: any) {
      logger.error('Error adding invoice link', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to add invoice link: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setInvoiceLoading(false)
    }
  }

  const handleUploadInvoice = async () => {
    if (!invoiceFile || !selectedEntry) return
    
    try {
      setInvoiceLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to upload invoices',
          variant: 'destructive'
        })
        setInvoiceLoading(false)
        return
      }

      // Get tenant_id - required for RLS policy
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // If tenant_id is missing, fetch it from database
      let effectiveTenantId = tenantId
      if (!isSuper && !effectiveTenantId) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        if (tenantUser?.tenant_id) {
          effectiveTenantId = tenantUser.tenant_id
          sessionStorage.setItem('current_tenant_id', effectiveTenantId)
        }
      }
      
      // Convert file to base64 for storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        
        // Prepare comment data with tenant_id
        const commentDataToInsert: any = {
          vehicle_inward_id: selectedEntry.id,
          comment: `INVOICE_REF:${invoiceFile.type.startsWith('image/') ? 'image' : 'file'}:${invoiceFile.name}`,
          created_by: user.email || user.id || 'accountant',
          role: userRole || 'accountant'
        }

        // Add tenant_id if available (super admins can have null tenant_id)
        if (!isSuper && effectiveTenantId) {
          commentDataToInsert.tenant_id = effectiveTenantId
        }
        
        // Create a comment with attachment
        const { data: commentData, error: commentError } = await supabase
          .from('vehicle_inward_comments')
          .insert(commentDataToInsert)
          .select()
          .single()

        if (commentError) throw commentError

        // Add attachment
        const { error: attachError } = await supabase
          .from('vehicle_inward_comment_attachments')
          .insert({
            comment_id: commentData.id,
            file_name: invoiceFile.name,
            file_url: base64,
            file_type: invoiceFile.type,
            file_size: invoiceFile.size
          })

        if (attachError) throw attachError

        // Update attachment count
        await supabase
          .from('vehicle_inward_comments')
          .update({ attachments_count: 1 })
          .eq('id', commentData.id)

        setInvoiceFile(null)
        await loadInvoiceReferences()
        toast({
          title: 'Success',
          description: 'Invoice uploaded successfully!',
          variant: 'default'
        })
        setInvoiceLoading(false)
      }
      reader.readAsDataURL(invoiceFile)
    } catch (error: any) {
      logger.error('Error uploading invoice', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to upload invoice: ${error.message}`,
        variant: 'destructive'
      })
      setInvoiceLoading(false)
    }
  }

  const handleSaveInvoiceNumber = async () => {
    if (!selectedEntry) return
    
    try {
      setSavingInvoiceNumber(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Get current vehicle data to update notes
      const { data: vehicleData } = await supabase
        .from('vehicle_inward')
        .select('notes')
        .eq('id', selectedEntry.id)
        .single()
      
      if (!vehicleData) {
        throw new Error('Vehicle entry not found')
      }
      
      // Parse existing notes or create new object
      let notesData: any = {}
      if (vehicleData.notes) {
        try {
          notesData = JSON.parse(vehicleData.notes)
        } catch {
          notesData = {}
        }
      }
      
      // Update invoice number
      notesData.invoice_number = invoiceNumberInput.trim() || null
      
      // Update in database
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ 
          notes: JSON.stringify(notesData),
          invoice_number: invoiceNumberInput.trim() || null,
          billing_status: invoiceNumberInput.trim() ? 'invoiced' : 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEntry.id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery
      
      if (error) throw error
      
      // Update local entry state
      const updatedEntry = {
        ...selectedEntry,
        invoiceNumber: invoiceNumberInput.trim() || undefined,
        billingStatus: invoiceNumberInput.trim() ? 'invoiced' : 'draft'
      }
      setSelectedEntry(updatedEntry)
      
      // Update entries list
      setEntries(prev => prev.map(e => 
        e.id === selectedEntry.id ? updatedEntry : e
      ))
      
      setEditingInvoiceNumber(false)
      toast({
        title: 'Success',
        description: 'Invoice number saved successfully!',
        variant: 'default'
      })
    } catch (error: any) {
      logger.error('Error saving invoice number', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to save invoice number: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setSavingInvoiceNumber(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedEntry) return
    
    if (!confirm('Are you sure you want to mark this entry as Complete? This will finalize the accountant\'s work.')) {
      return
    }

    try {
      setUpdatingStatus(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ status: 'completed' })
        .eq('id', selectedEntry.id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery

      if (error) throw error

      // Update the entry in local state immediately for better UX
      const updatedEntries = entries.filter(e => e.id !== selectedEntry.id)
      setEntries(updatedEntries)
      
      toast({
        title: 'Success',
        description: 'Entry marked as Complete! The entry has been removed from the Accounts list.',
        variant: 'default'
      })
      setSelectedEntry(null)
      
      // Refresh entries list to ensure consistency
      await fetchAccountEntries()
      
      // Delay to ensure database consistency before calculating stats
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh billing stats to update KPI cards
      await fetchBillingStats()
    } catch (error: any) {
      logger.error('Error updating status', error, 'AccountsPageClient')
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            width: '3rem',
            height: '3rem',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: '#6b7280' }}>Loading account entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Accounts</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
              Manage invoicing for completed installations
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              onClick={() => {
                if (activeTab === 'entries') {
                  fetchAccountEntries()
                } else {
                  fetchCompletedEntries()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              <Clock style={{ width: '1rem', height: '1rem' }} />
              Refresh
            </button>
            <button 
              onClick={handleExportToExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            >
              <Download style={{ width: '1rem', height: '1rem' }} />
              Export to Excel
            </button>
          </div>
        </div>


        {/* KPI Cards - Always Visible */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{
              backgroundColor: '#fef2f2',
            borderRadius: '0.75rem',
            padding: '1.25rem',
              border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Receivable</span>
                <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            </div>
              <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                {loadingStats ? '...' : formatCurrency(billingStats.totalReceivable)}
            </div>
          </div>
          <div style={{
              backgroundColor: '#fee2e2',
            borderRadius: '0.75rem',
            padding: '1.25rem',
              border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Outstanding Amount</span>
                <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                {loadingStats ? '...' : formatCurrency(billingStats.outstandingAmount)}
            </div>
            </div>
          <div style={{
              backgroundColor: '#dbeafe',
            borderRadius: '0.75rem',
            padding: '1.25rem',
              border: '1px solid #bfdbfe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Partial Payments</span>
                <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                {loadingStats ? '...' : billingStats.partialPaymentsCount}
            </div>
            </div>
            <div style={{
              backgroundColor: '#fee2e2',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid #fecaca'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Overdue Entries</span>
                <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                {loadingStats ? '...' : billingStats.overdueEntries}
          </div>
        </div>
          </div>

      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '3rem' }}>
            <button
            onClick={() => setActiveTab('entries')}
              style={{
              padding: '1.25rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'entries' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'entries' ? '700' : '500',
              borderBottom: activeTab === 'entries' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <FileText style={{ width: '1.125rem', height: '1.125rem' }} />
            Billing Entries
            </button>
            <button
            onClick={() => {
              setActiveTab('ledger')
              loadLedger('vehicle')
            }}
              style={{
              padding: '1.25rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'ledger' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'ledger' ? '700' : '500',
              borderBottom: activeTab === 'ledger' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <BarChart3 style={{ width: '1.125rem', height: '1.125rem' }} />
            Partial Payment
            </button>
            <button
            onClick={() => setActiveTab('overdue')}
              style={{
              padding: '1.25rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'overdue' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'overdue' ? '700' : '500',
              borderBottom: activeTab === 'overdue' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <AlertCircle style={{ width: '1.125rem', height: '1.125rem' }} />
            Overdue
            </button>
            <button
            onClick={() => {
              setActiveTab('completed')
              fetchCompletedEntries()
            }}
              style={{
              padding: '1.25rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'completed' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'completed' ? '700' : '500',
              borderBottom: activeTab === 'completed' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <CheckCircle style={{ width: '1.125rem', height: '1.125rem' }} />
            Settled
            </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2.5rem', minHeight: '60vh' }}>
        {activeTab === 'entries' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1.5rem' }}>
            {/* Search Bar */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#94a3b8'
                }} />
                <input
                  type="text"
                  placeholder="Search by customer, vehicle number, or entry ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Entries Table */}
            <div style={{ overflowX: 'auto' }}>
              {sortedEntries.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <FileText style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                    {searchTerm ? 'No entries found' : 'No entries available'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                    {searchTerm
                      ? 'Try adjusting your search terms'
                      : 'All vehicles from Vehicle Inward will appear here for invoicing'}
                  </p>
                  {!searchTerm && (
                    <div style={{ 
                      backgroundColor: '#f0f9ff', 
                      border: '1px solid #bae6fd', 
                      borderRadius: '0.5rem', 
                      padding: '1rem',
                      maxWidth: '500px',
                      margin: '0 auto',
                      textAlign: 'left'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#0369a1', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                        Accounts Workflow:
                      </p>
                      <ul style={{ fontSize: '0.8125rem', color: '#0284c7', margin: 0, paddingLeft: '1.25rem' }}>
                        <li>Vehicles appear here immediately after Vehicle Inward</li>
                        <li>You can add invoice numbers and manage invoicing at any stage</li>
                        <li>Mark as "Complete" when invoicing is finalized</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        {renderSortableHeader('shortId', 'Entry ID')}
                        {renderSortableHeader('customerName', 'Customer')}
                        {renderSortableHeader('vehicleNumber', 'Vehicle')}
                        {renderSortableHeader('netPayable', 'Net Payable')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        {renderSortableHeader('dueDate', 'Due Date')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Balance Due</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(sortedEntries).map((entry, idx) => {
                        const balanceDue = entry.balanceDue ?? (entry.netPayable ?? entry.finalAmount ?? entry.totalAmount ?? 0) - (entry.totalPaid ?? 0)
                        const isSelected = selectedEntry?.id === entry.id
                        return (
                          <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                              style={{
                              backgroundColor: isSelected ? '#eff6ff' : idx % 2 === 0 ? 'white' : '#f9fafb',
                              borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                              transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                              if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9'
                        }
                      }}
                      onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                        }
                      }}
                    >
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {entry.shortId || entry.id.substring(0, 8)}
                            </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                              {entry.customerName}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Car style={{ width: '1rem', height: '1rem' }} />
                                <span>{entry.model}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {entry.vehicleNumber}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                              {formatCurrency(entry.netPayable ?? entry.finalAmount ?? entry.totalAmount ?? 0)}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                              {entry.billingStatus ? (
                            <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  textTransform: 'capitalize',
                                  backgroundColor: entry.billingStatus === 'draft' ? '#fef3c7' : entry.billingStatus === 'invoiced' ? '#dbeafe' : '#d1fae5',
                                  color: entry.billingStatus === 'draft' ? '#92400e' : entry.billingStatus === 'invoiced' ? '#1e40af' : '#065f46'
                                }}>
                                  {entry.billingStatus}
                                </span>
                              ) : (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                                  display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />
                                  Complete
                            </span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              {entry.dueDate ? formatDateOnly(entry.dueDate) : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: balanceDue > 0.01 ? '#dc2626' : '#059669', fontWeight: '600' }}>
                              {formatCurrency(balanceDue)}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEntry(entry)
                                }}
                                style={{
                                  padding: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                color: '#2563eb',
                                  cursor: 'pointer',
                                  borderRadius: '0.375rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#eff6ff'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                <Eye style={{ width: '1rem', height: '1rem' }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <PaginationControls totalItems={sortedEntries.length} currentData={sortedEntries} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Time Filter and Analytics Cards */}
              {/* Completed Entries List */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Search Bar */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#94a3b8'
                  }} />
                  <input
                    type="text"
                    placeholder="Search completed entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {sortedCompleted.length} {sortedCompleted.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>

              {/* Settled Entries Table */}
              <div style={{ overflowX: 'auto' }}>
                {completedLoading ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #2563eb',
                      borderRadius: '50%',
                      width: '3rem',
                      height: '3rem',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Loading completed entries...</p>
                  </div>
                ) : sortedCompleted.length === 0 ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <CheckCircle style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                      {searchTerm ? 'No entries found' : 'No completed entries in selected period'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {searchTerm ? 'Try adjusting your search terms' : 'Completed entries will appear here'}
                    </p>
                  </div>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          {renderSortableHeader('shortId', 'Entry ID')}
                          {renderSortableHeader('customerName', 'Customer')}
                          {renderSortableHeader('vehicleNumber', 'Vehicle')}
                          {renderSortableHeader('totalAmount', 'Final Amount')}
                          {renderSortableHeader('completed_at', 'Completion Date')}
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedData(sortedCompleted).map((entry, idx) => {
                          const isSelected = selectedEntry?.id === entry.id
                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setSelectedEntry(entry)}
                    style={{
                                backgroundColor: isSelected ? '#eff6ff' : idx % 2 === 0 ? 'white' : '#f9fafb',
                                borderBottom: '1px solid #e2e8f0',
                                cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#f1f5f9'
                      }
                    }}
                    onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                                }
                              }}
                            >
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  {entry.shortId || entry.id.substring(0, 8)}
                </div>
                              </td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                                {entry.customerName}
                              </td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Car style={{ width: '1rem', height: '1rem' }} />
                                  <span>{entry.model}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                  {entry.vehicleNumber}
                                </div>
                              </td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#059669', fontWeight: '700' }}>
                                {formatCurrency(entry.finalAmount || entry.totalAmount)}
                              </td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                {entry.completed_at ? formatDate(entry.completed_at) : 'N/A'}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedEntry(entry)
                                  }}
                      style={{
                                    padding: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#2563eb',
                        cursor: 'pointer',
                                    borderRadius: '0.375rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#eff6ff'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                  }}
                                >
                                  <Eye style={{ width: '1rem', height: '1rem' }} />
                    </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <PaginationControls totalItems={sortedCompleted.length} currentData={sortedCompleted} />
                  </>
                )}
                </div>
                    </div>
                    </div>
                  </div>
                )}

        {/* Overdue Tab */}
        {activeTab === 'overdue' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1.5rem' }}>
              {/* Search Bar */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#94a3b8'
                  }} />
                  <input
                    type="text"
                  placeholder="Search by customer, vehicle number, or entry ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {sortedOverdue.length} {sortedOverdue.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>

            {/* Overdue Entries Table */}
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #2563eb',
                      borderRadius: '50%',
                      width: '3rem',
                      height: '3rem',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }}></div>
                  <p style={{ color: '#6b7280' }}>Loading overdue entries...</p>
                  </div>
              ) : sortedOverdue.length === 0 ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <AlertCircle style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                    {searchTerm ? 'No overdue entries found' : 'No overdue entries'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {searchTerm ? 'Try adjusting your search terms' : 'All entries are up to date'}
                    </p>
                  </div>
                ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        {renderSortableHeader('shortId', 'Entry ID')}
                        {renderSortableHeader('customerName', 'Customer')}
                        {renderSortableHeader('vehicleNumber', 'Vehicle')}
                        {renderSortableHeader('balanceDue', 'Balance Due')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Days Overdue</th>
                        {renderSortableHeader('dueDate', 'Due Date')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(sortedOverdue).map((entry, idx) => {
                        const balanceDue = entry.balanceDue ?? (entry.netPayable ?? entry.finalAmount ?? entry.totalAmount ?? 0) - (entry.totalPaid ?? 0)
                        const daysOverdue = entry.dueDate ? Math.floor((new Date().getTime() - new Date(entry.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
                        const isSelected = selectedEntry?.id === entry.id
                        return (
                          <tr
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        style={{
                              backgroundColor: isSelected ? '#fef2f2' : idx % 2 === 0 ? 'white' : '#f9fafb',
                              borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#fee2e2'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                              }
                            }}
                          >
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {entry.shortId || entry.id.substring(0, 8)}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                                {entry.customerName}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Car style={{ width: '1rem', height: '1rem' }} />
                                <span>{entry.model}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {entry.vehicleNumber}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: '700' }}>
                              {formatCurrency(balanceDue)}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {daysOverdue > 0 ? `${daysOverdue}d` : '0d'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#dc2626' }}>
                              {entry.dueDate ? formatDate(entry.dueDate) : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEntry(entry)
                                }}
                                style={{
                                  padding: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  borderRadius: '0.375rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                <Eye style={{ width: '1rem', height: '1rem' }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <PaginationControls totalItems={sortedOverdue.length} currentData={sortedOverdue} />
                </>
              )}
                                </div>
                                    </div>
                                  )}

        {/* Partial Payment Tab */}
        {activeTab === 'ledger' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1.5rem' }}>
            {/* Search Bar */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#94a3b8'
                }} />
                <input
                  type="text"
                  placeholder="Search by customer, vehicle number, or entry ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {sortedPartialPayments.length} {sortedPartialPayments.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Partial Payment Entries Table */}
            <div style={{ overflowX: 'auto' }}>
              {sortedPartialPayments.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <Clock style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                    {searchTerm ? 'No entries found' : 'No partial payment entries'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                    {searchTerm
                      ? 'Try adjusting your search terms'
                      : 'Entries with partial payments will appear here once payments are recorded'}
                  </p>
                </div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        {renderSortableHeader('shortId', 'Entry ID')}
                        {renderSortableHeader('customerName', 'Customer')}
                        {renderSortableHeader('vehicleNumber', 'Vehicle')}
                        {renderSortableHeader('netPayable', 'Net Payable')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Amount Paid</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Balance Due</th>
                        {renderSortableHeader('dueDate', 'Due Date')}
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(sortedPartialPayments).map((entry, idx) => {
                        const balanceDue = entry.balanceDue ?? (entry.netPayable ?? entry.finalAmount ?? entry.totalAmount ?? 0) - (entry.totalPaid ?? 0)
                        const totalPaid = entry.totalPaid ?? 0
                        const netPayable = entry.netPayable ?? (entry.totalAmount - (entry.discountAmount || 0) + (entry.taxAmount || 0)) ?? entry.finalAmount ?? entry.totalAmount ?? 0
                        const isSelected = selectedEntry?.id === entry.id
                        return (
                          <tr
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            style={{
                              backgroundColor: isSelected ? '#eff6ff' : idx % 2 === 0 ? 'white' : '#f9fafb',
                              borderBottom: '1px solid #e2e8f0',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f1f5f9'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                              }
                            }}
                          >
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {entry.shortId || entry.id.substring(0, 8)}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                              {entry.customerName}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Car style={{ width: '1rem', height: '1rem' }} />
                                <span>{entry.model}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {entry.vehicleNumber}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                              {formatCurrency(netPayable)}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#059669', fontWeight: '600', textAlign: 'right' }}>
                              {formatCurrency(totalPaid)}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: '600', textAlign: 'right' }}>
                              {formatCurrency(balanceDue)}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              {entry.dueDate ? formatDateOnly(entry.dueDate) : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                textTransform: 'capitalize',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af'
                              }}>
                                Partially Paid
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEntry(entry)
                                }}
                                style={{
                                  padding: '0.5rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  borderRadius: '0.375rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#eff6ff'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                <Eye style={{ width: '1rem', height: '1rem' }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <PaginationControls totalItems={sortedPartialPayments.length} currentData={sortedPartialPayments} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Entry Details Full Screen View */}
      {selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f9fafb',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Full Screen Header */}
            <div style={{
            padding: '1.75rem 2.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'white',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                    Billing Entry Details
                </h2>
                  {(() => {
                    const totalPaid = selectedEntry.totalPaid || 0
                    const balanceDue = selectedEntry.balanceDue ?? (selectedEntry.netPayable ?? (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) ?? selectedEntry.finalAmount ?? selectedEntry.totalAmount ?? 0) - totalPaid
                    const isOverdue = selectedEntry.dueDate && balanceDue > 0.01 && new Date(selectedEntry.dueDate) < new Date()
                    
                    let paymentStatus: 'draft' | 'partially_paid' | 'paid' | 'overdue' = 'draft'
                    if (totalPaid === 0) paymentStatus = 'draft'
                    else if (balanceDue <= 0.01) paymentStatus = 'paid'
                    else if (isOverdue) paymentStatus = 'overdue'
                    else paymentStatus = 'partially_paid'
                    
                    return (
                      <span style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        letterSpacing: '0.05em',
                        backgroundColor: paymentStatus === 'draft' ? '#fef3c7' : paymentStatus === 'partially_paid' ? '#dbeafe' : paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2',
                        color: paymentStatus === 'draft' ? '#92400e' : paymentStatus === 'partially_paid' ? '#1e40af' : paymentStatus === 'paid' ? '#065f46' : '#991b1b',
                        border: `1px solid ${paymentStatus === 'draft' ? '#fde68a' : paymentStatus === 'partially_paid' ? '#bfdbfe' : paymentStatus === 'paid' ? '#a7f3d0' : '#fecaca'}`
                      }}>
                        {paymentStatus === 'partially_paid' ? 'Partially Paid' : paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'overdue' ? 'Overdue' : 'Draft'}
                      </span>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    Entry ID: <span style={{ color: '#111827', fontWeight: '600' }}>{selectedEntry.shortId || selectedEntry.id.substring(0, 8)}</span>
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>•</span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Customer: <span style={{ color: '#111827', fontWeight: '600' }}>{selectedEntry.customerName}</span>
                  </span>
                </div>
              </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                style={{
                padding: '0.625rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                gap: '0.5rem',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.color = '#111827'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.color = '#374151'
                }}
              >
              <X style={{ width: '1rem', height: '1rem' }} />
              Close
              </button>
            </div>

          {/* Full Screen Content - New Tabbed Layout */}
          <div style={{ 
            flex: 1, 
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
          }}>
            {/* Summary Sidebar - Always Visible */}
            {!isMobile && (
            <div style={{
              width: '360px',
              minWidth: '360px',
              backgroundColor: 'white',
              borderRight: '1px solid #e5e7eb',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '1px 0 3px rgba(0,0,0,0.05)'
            }}>
              {/* Sidebar Content - Quick Stats Card */}
              {(() => {
                const netPayable = selectedEntry.netPayable || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                // Use synced values from selectedEntry if available, otherwise calculate from payments
                const totalPaid = selectedEntry.totalPaid !== undefined 
                  ? selectedEntry.totalPaid 
                  : ((selectedEntry.payments && Array.isArray(selectedEntry.payments) && selectedEntry.payments.length > 0)
                      ? selectedEntry.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
                      : (payments && payments.length > 0 
                          ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) 
                          : 0))
                const balanceDue = selectedEntry.balanceDue !== undefined
                  ? selectedEntry.balanceDue
                  : Math.max(0, netPayable - totalPaid)
                const isOverdue = selectedEntry.dueDate && balanceDue > 0.01 && new Date(selectedEntry.dueDate) < new Date()
                let paymentStatus: 'draft' | 'partially_paid' | 'paid' | 'overdue' = 'draft'
                if (totalPaid === 0) paymentStatus = 'draft'
                else if (balanceDue > 0.01) paymentStatus = isOverdue ? 'overdue' : 'partially_paid'
                else paymentStatus = 'paid'

                return (
                  <>
                    {/* Quick Stats Card */}
                    <div style={{ 
                      padding: '1.75rem', 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#f8fafc'
                    }}>
                      <h3 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#64748b', 
                        marginBottom: '1.25rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em' 
                      }}>
                        Quick Stats
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '0.875rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Total Amount</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                            {formatCurrency(netPayable)}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '0.875rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Amount Paid</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                            {formatCurrency(totalPaid)}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '0.875rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Balance Due</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: balanceDue > 0.01 ? '#dc2626' : '#059669' }}>
                            {formatCurrency(balanceDue)}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '0.875rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>Payment Status</div>
                          <span style={{
                            padding: '0.5rem 0.875rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            backgroundColor: paymentStatus === 'draft' ? '#fef3c7' : paymentStatus === 'partially_paid' ? '#dbeafe' : paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2',
                            color: paymentStatus === 'draft' ? '#92400e' : paymentStatus === 'partially_paid' ? '#1e40af' : paymentStatus === 'paid' ? '#065f46' : '#991b1b',
                            textTransform: 'capitalize',
                            display: 'inline-block'
                          }}>
                            {paymentStatus === 'partially_paid' ? 'Partially Paid' : paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'overdue' ? 'Overdue' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            )}

            {/* Main Content Area with Tabs */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#f8fafc'
            }}>
              {/* Tab Navigation */}
              <div style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 2rem',
                display: 'flex',
                gap: '0.25rem',
                overflowX: 'auto',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {(['details', 'overview', 'products', 'invoice', 'comments'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    style={{
                      padding: '1.25rem 2rem',
                      backgroundColor: activeDetailTab === tab ? '#eff6ff' : 'transparent',
                      border: 'none',
                      borderBottom: activeDetailTab === tab ? '3px solid #2563eb' : '3px solid transparent',
                      color: activeDetailTab === tab ? '#2563eb' : '#64748b',
                      fontWeight: activeDetailTab === tab ? '600' : '500',
                      fontSize: '0.9375rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (activeDetailTab !== tab) {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                        e.currentTarget.style.color = '#111827'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeDetailTab !== tab) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#64748b'
                      }
                    }}
                  >
                    {tab === 'details' ? 'Details' :
                     tab === 'overview' ? 'Overview' : 
                     tab === 'products' ? 'Product & Pricing' :
                     tab === 'invoice' ? 'Invoice & Reconciliation' :
                     'Comments & Attachments'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                backgroundColor: '#f8fafc'
              }}>
                {/* Details Tab */}
                {activeDetailTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Customer Information Card */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          borderRadius: '0.75rem',
                          backgroundColor: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                        }}>
                          <User style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          Customer Information
                        </h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerPhone}</div>
                        </div>
                        {selectedEntry.customerEmail && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerEmail}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Information Card */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          borderRadius: '0.75rem',
                          backgroundColor: '#f0fdf4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)'
                        }}>
                          <Car style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          Vehicle Information
                        </h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Number</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.vehicleNumber}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.make}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.model}</div>
                        </div>
                        {selectedEntry.year && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.year}</div>
                          </div>
                        )}
                        {selectedEntry.color && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.color}</div>
                          </div>
                        )}
                        {selectedEntry.vehicleType && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Type</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                              {vehicleTypeNames.get(selectedEntry.vehicleType) || selectedEntry.vehicleType}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Installation Details Card */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          borderRadius: '0.75rem',
                          backgroundColor: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(217, 119, 6, 0.1)'
                        }}>
                          <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          Installation Details
                        </h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installation Date</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                            {formatDate(selectedEntry.installationCompleteDate)}
                          </div>
                        </div>
                        {selectedEntry.expectedDelivery && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Delivery</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                              {new Date(selectedEntry.expectedDelivery).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                        {selectedEntry.location && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                              {locationNames.get(selectedEntry.location) || selectedEntry.location}
                            </div>
                          </div>
                        )}
                        {selectedEntry.manager && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Manager</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                              {managerNames.get(selectedEntry.manager) || selectedEntry.manager}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Due Date Card */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '1rem', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)'
                          }}>
                            <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626' }} />
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            Due Date
                          </h3>
                        </div>
                        {!editingDueDate && (
                          <button
                            onClick={() => setEditingDueDate(true)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.5rem',
                              color: '#475569',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e2e8f0'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f1f5f9'
                            }}
                          >
                            <Edit2 style={{ width: '1rem', height: '1rem' }} />
                            Edit
                          </button>
                        )}
                      </div>
                      {editingDueDate ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.75rem', 
                              color: '#64748b', 
                              marginBottom: '0.5rem', 
                              fontWeight: '500', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em' 
                            }}>
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={dueDateInput}
                              onChange={(e) => setDueDateInput(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                fontSize: '0.9375rem',
                                outline: 'none',
                                backgroundColor: 'white',
                                transition: 'border-color 0.2s'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#2563eb'
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0'
                                e.target.style.boxShadow = 'none'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEditingDueDate(false)
                                setDueDateInput(selectedEntry.dueDate ? new Date(selectedEntry.dueDate).toISOString().split('T')[0] : '')
                              }}
                              style={{
                                padding: '0.625rem 1.25rem',
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                color: '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveDueDate}
                              disabled={savingDueDate}
                              style={{
                                padding: '0.625rem 1.25rem',
                                backgroundColor: savingDueDate ? '#94a3b8' : '#2563eb',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: savingDueDate ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                              onMouseEnter={(e) => {
                                if (!savingDueDate) {
                                  e.currentTarget.style.backgroundColor = '#1d4ed8'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!savingDueDate) {
                                  e.currentTarget.style.backgroundColor = '#2563eb'
                                }
                              }}
                            >
                              {savingDueDate ? 'Saving...' : 'Save'}
                              {!savingDueDate && <Save style={{ width: '1rem', height: '1rem' }} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600', color: selectedEntry.dueDate && new Date(selectedEntry.dueDate) < new Date() && (selectedEntry.balanceDue || 0) > 0.01 ? '#dc2626' : '#111827' }}>
                            {selectedEntry.dueDate ? formatDateOnly(selectedEntry.dueDate) : 'Not set'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Overview Tab */}
                {activeDetailTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Payment Summary Section */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)'
                          }}>
                            <DollarSign style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            Payment Summary
                          </h3>
                        </div>
                        {selectedEntry.billingStatus !== 'closed' && (
                          <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.625rem 1rem',
                              backgroundColor: (!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0) ? '#f3f4f6' : '#059669',
                              color: (!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0) ? '#9ca3af' : 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: (!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: (!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0) ? 'none' : '0 1px 2px rgba(5, 150, 105, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                              if (!(!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0)) {
                                e.currentTarget.style.backgroundColor = '#047857'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(!selectedEntry.netPayable || (selectedEntry.netPayable || 0) <= 0)) {
                                e.currentTarget.style.backgroundColor = '#059669'
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(5, 150, 105, 0.2)'
                              }
                            }}
                          >
                            <Plus style={{ width: '1rem', height: '1rem' }} />
                            Add Payment
                          </button>
                        )}
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.75rem', border: '1px solid #e5e7eb' }}>
                        {(() => {
                          const netPayable = selectedEntry.netPayable || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                          // Use synced values from selectedEntry if available, otherwise calculate from payments
                          const totalPaid = selectedEntry.totalPaid !== undefined 
                            ? selectedEntry.totalPaid 
                            : ((selectedEntry.payments && Array.isArray(selectedEntry.payments) && selectedEntry.payments.length > 0)
                                ? selectedEntry.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
                                : (payments && payments.length > 0 
                                    ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) 
                                    : 0))
                          const balanceDue = selectedEntry.balanceDue !== undefined
                            ? selectedEntry.balanceDue
                            : Math.max(0, netPayable - totalPaid)
                          const isOverdue = selectedEntry.dueDate && balanceDue > 0.01 && new Date(selectedEntry.dueDate) < new Date()
                          let paymentStatus: 'draft' | 'partially_paid' | 'paid' | 'overdue' = 'draft'
                          if (totalPaid === 0) paymentStatus = 'draft'
                          else if (balanceDue > 0.01) paymentStatus = isOverdue ? 'overdue' : 'partially_paid'
                          else paymentStatus = 'paid'

                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '1.5rem', 
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Amount</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
                                  {formatCurrency(netPayable)}
                                </div>
                              </div>
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '1.5rem', 
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#059669', lineHeight: '1.2' }}>
                                  {formatCurrency(totalPaid)}
                                </div>
                              </div>
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '1.5rem', 
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance Due</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: balanceDue > 0.01 ? '#dc2626' : '#059669', lineHeight: '1.2' }}>
                                  {formatCurrency(balanceDue)}
                                </div>
                              </div>
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '1.5rem', 
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</div>
                                <span style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  backgroundColor: paymentStatus === 'draft' ? '#fef3c7' : paymentStatus === 'partially_paid' ? '#dbeafe' : paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2',
                                  color: paymentStatus === 'draft' ? '#92400e' : paymentStatus === 'partially_paid' ? '#1e40af' : paymentStatus === 'paid' ? '#065f46' : '#991b1b',
                                  textTransform: 'capitalize',
                                  display: 'inline-block'
                                }}>
                                  {paymentStatus === 'partially_paid' ? 'Partially Paid' : paymentStatus === 'paid' ? 'Paid in Full' : paymentStatus === 'overdue' ? 'Overdue' : 'Draft'}
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Payment Timeline */}
                    {selectedEntry && (
                      <div style={{ 
                        backgroundColor: 'white', 
                        borderRadius: '0.875rem', 
                        padding: '2rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem', 
                          marginBottom: '1.75rem',
                          paddingBottom: '1.25rem',
                          borderBottom: '2px solid #f1f5f9'
                        }}>
                          <div style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(217, 119, 6, 0.1)'
                          }}>
                            <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            Payment Timeline
                          </h3>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1rem' }}>
                          <PaymentTimeline
                            entryId={selectedEntry.id}
                            entryCreatedAt={selectedEntry.created_at}
                            invoiceNumber={selectedEntry.invoiceNumber}
                            invoiceDate={selectedEntry.invoiceDate}
                            payments={payments}
                            isClosed={selectedEntry.billingStatus === 'closed'}
                            closedAt={selectedEntry.billingClosedAt}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Products Tab */}
                {activeDetailTab === 'products' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Product Details with Prices - Editable */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '1.75rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#fce7f3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(219, 39, 119, 0.1)'
                          }}>
                            <Package style={{ width: '1.5rem', height: '1.5rem', color: '#db2777' }} />
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            Product Details & Pricing
                          </h3>
                        </div>
                  {!editingProducts && (
                    <button
                      onClick={handleEditProducts}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb'
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      <Edit2 style={{ width: '1rem', height: '1rem' }} />
                      Edit Products
                    </button>
                  )}
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>
                          Product
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>
                          Brand
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>
                          Department
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedProducts.length > 0 ? (
                        editedProducts.map((product, idx) => (
                          <tr key={idx} style={{ 
                            borderBottom: idx < editedProducts.length - 1 ? '1px solid #e5e7eb' : 'none',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f8fafc'
                          }}
                          >
                            <td style={{ padding: '1.125rem 1.5rem' }}>
                              {editingProducts ? (
                                <input
                                  type="text"
                                  value={product.product}
                                  onChange={(e) => handleProductChange(idx, 'product', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.9375rem', color: '#111827', fontWeight: '600' }}>
                                  {product.product}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1.125rem 1.5rem' }}>
                              {editingProducts ? (
                                <input
                                  type="text"
                                  value={product.brand}
                                  onChange={(e) => handleProductChange(idx, 'brand', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.625rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.9375rem', color: '#64748b', fontWeight: '500' }}>
                                  {product.brand}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1.125rem 1.5rem' }}>
                              {editingProducts ? (
                                <select
                                  value={product.department}
                                  onChange={(e) => handleProductChange(idx, 'department', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.625rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  {Array.from(departmentNames.entries()).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ fontSize: '0.9375rem', color: '#64748b', fontWeight: '500' }}>
                                  {departmentNames.get(product.department) || product.department}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1.125rem 1.5rem', textAlign: 'right' }}>
                              {editingProducts ? (
                                <input
                                  type="number"
                                  value={product.price}
                                  onChange={(e) => handleProductChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'right'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
                                  {formatCurrency(product.price)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                            No products listed
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #e5e7eb' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '1.5rem', fontSize: '1.125rem', fontWeight: '700', color: '#111827', textAlign: 'right' }}>
                          Total Amount:
                        </td>
                        <td style={{ padding: '1.5rem', fontSize: '1.5rem', fontWeight: '700', color: '#059669', textAlign: 'right' }}>
                          {formatCurrency(editedProducts.reduce((sum, p) => sum + p.price, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {editingProducts && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.25rem' }} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProducts}
                      disabled={savingProducts}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: savingProducts ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: savingProducts ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Save style={{ width: '1rem', height: '1rem' }} />
                      {savingProducts ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}

                {/* Discount Section */}
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.875rem', 
                  padding: '2rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1.75rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '2px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '0.75rem',
                        backgroundColor: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(239, 68, 68, 0.1)'
                      }}>
                        <Percent style={{ width: '1.5rem', height: '1.5rem', color: '#ef4444' }} />
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Discount Information
                      </h3>
                    </div>
                    {!editingDiscount && (
                      <button
                        onClick={() => setEditingDiscount(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444'
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        <Edit2 style={{ width: '1rem', height: '1rem' }} />
                        {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 ? 'Edit Discount' : 'Add Discount'}
                      </button>
                    )}
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                    {editingDiscount ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Discount Amount (Rs.)
                          </label>
                          <input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Enter discount amount"
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Offered By (Name/Department)
                          </label>
                          <input
                            type="text"
                            value={discountOfferedBy}
                            onChange={(e) => setDiscountOfferedBy(e.target.value)}
                            placeholder="e.g., Manager Name, Sales Team"
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Discount Reason
                          </label>
                          <textarea
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Reason for discount (e.g., Bulk order, Loyalty customer)"
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditingDiscount(false)
                              if (selectedEntry) {
                                setDiscountAmount(selectedEntry.discountAmount?.toString() || '')
                                setDiscountOfferedBy(selectedEntry.discountOfferedBy || '')
                                setDiscountReason(selectedEntry.discountReason || '')
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!selectedEntry) return
                              try {
                                setSavingDiscount(true)
                                const discount = parseFloat(discountAmount) || 0
                                const discountPercentage = selectedEntry.totalAmount > 0 ? (discount / selectedEntry.totalAmount) * 100 : 0
                                
                                // Store discount data in notes field as JSON
                                const discountData = {
                                  discount_amount: discount,
                                  discount_percentage: discountPercentage,
                                  discount_offered_by: discountOfferedBy,
                                  discount_reason: discountReason
                                }
                                
                                // Get existing notes or create new
                                const tenantId = getCurrentTenantId()
                                const isSuper = isSuperAdmin()
                                
                                let notesQuery = supabase
                                  .from('vehicle_inward')
                                  .select('notes')
                                  .eq('id', selectedEntry.id)
                                
                                if (!isSuper && tenantId) {
                                  notesQuery = notesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { data: existing } = await notesQuery.single()
                                
                                let notesData: any = {}
                                if (existing?.notes) {
                                  try {
                                    notesData = JSON.parse(existing.notes)
                                  } catch {
                                    notesData = {}
                                  }
                                }
                                
                                notesData.discount = discountData
                                
                                let updateNotesQuery = supabase
                                  .from('vehicle_inward')
                                  .update({ notes: JSON.stringify(notesData) })
                                  .eq('id', selectedEntry.id)
                                
                                if (!isSuper && tenantId) {
                                  updateNotesQuery = updateNotesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { error } = await updateNotesQuery
                                
                                if (error) throw error
                                
                                // Refresh entries to get updated data
                                const updatedEntries = await fetchAccountEntries()
                                
                                // Sync selected entry with updated data
                                await syncSelectedEntry(updatedEntries)
                                
                                setEditingDiscount(false)
                                toast({
                                  title: 'Success',
                                  description: 'Discount information saved successfully!',
                                  variant: 'default'
                                })
                              } catch (error: any) {
                                logger.error('Error saving discount', error, 'AccountsPageClient')
                                toast({
                                  title: 'Error',
                                  description: `Failed to save discount: ${error.message}`,
                                  variant: 'destructive'
                                })
                              } finally {
                                setSavingDiscount(false)
                              }
                            }}
                            disabled={savingDiscount}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: savingDiscount ? '#9ca3af' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: savingDiscount ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Save style={{ width: '1rem', height: '1rem' }} />
                            {savingDiscount ? 'Saving...' : 'Save Discount'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Discount Amount</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedEntry.discountAmount && selectedEntry.discountAmount > 0 ? '#ef4444' : '#9ca3af' }}>
                            {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 
                              ? formatCurrency(selectedEntry.discountAmount) 
                              : 'No discount'}
                          </div>
                        </div>
                        {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 && (
                          <>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Discount Percentage</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>
                                {selectedEntry.discountPercentage?.toFixed(2) || '0'}%
                              </div>
                            </div>
                            {selectedEntry.discountOfferedBy && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Offered By</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                  {selectedEntry.discountOfferedBy}
                                </div>
                              </div>
                            )}
                            {selectedEntry.discountReason && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Reason</div>
                                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                                  {selectedEntry.discountReason}
                                </div>
                              </div>
                            )}
                            <div style={{ gridColumn: '1 / -1', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', marginTop: '0.5rem', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Final Amount (After Discount):</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                                  {formatCurrency(selectedEntry.finalAmount || selectedEntry.totalAmount)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Details Section */}
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.875rem', 
                  padding: '2rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1.75rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '2px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '0.75rem',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)'
                      }}>
                        <DollarSign style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Payment History
                      </h3>
                    </div>
                    {selectedEntry.billingStatus !== 'closed' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={(() => {
                          const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                          return netPayable <= 0
                        })()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: (() => {
                            const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                            return netPayable <= 0 ? '#f3f4f6' : '#059669'
                          })(),
                          color: (() => {
                            const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                            return netPayable <= 0 ? '#9ca3af' : 'white'
                          })(),
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: (() => {
                            const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                            return netPayable <= 0 ? 'not-allowed' : 'pointer'
                          })(),
                          transition: 'all 0.2s',
                          boxShadow: (() => {
                            const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                            return netPayable <= 0 ? 'none' : '0 1px 2px rgba(5, 150, 105, 0.2)'
                          })()
                        }}
                        onMouseEnter={(e) => {
                          const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                          if (netPayable > 0) {
                            e.currentTarget.style.backgroundColor = '#047857'
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                          if (netPayable > 0) {
                            e.currentTarget.style.backgroundColor = '#059669'
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(5, 150, 105, 0.2)'
                          }
                        }}
                      >
                        <Plus style={{ width: '1rem', height: '1rem' }} />
                        Add Payment
                      </button>
                    )}
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.75rem', border: '1px solid #e5e7eb' }}>
                    {(() => {
                      const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                      const paymentsToUse = (selectedEntry.payments && Array.isArray(selectedEntry.payments) && selectedEntry.payments.length > 0) 
                        ? selectedEntry.payments 
                        : (payments && payments.length > 0 ? payments : [])
                      // Use synced values from selectedEntry if available
                      const totalPaid = selectedEntry.totalPaid !== undefined 
                        ? selectedEntry.totalPaid 
                        : paymentsToUse.reduce((sum, p) => sum + (p.amount || 0), 0)
                      const balanceDue = selectedEntry.balanceDue !== undefined
                        ? selectedEntry.balanceDue
                        : Math.max(0, netPayable - totalPaid)

                      return (
                        <>
                          {paymentsToUse.length > 0 ? (
                            <div>
                              <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                                    <tr>
                                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>Date</th>
                                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>Amount</th>
                                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>Method</th>
                                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>Reference</th>
                                      {selectedEntry.billingStatus !== 'closed' && (
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>Action</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paymentsToUse.map((payment, idx) => (
                                      <tr key={payment.id} style={{ 
                                        borderBottom: idx < paymentsToUse.length - 1 ? '1px solid #e5e7eb' : 'none',
                                        backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f1f5f9'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f8fafc'
                                      }}
                                      >
                                        <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', color: '#111827', fontWeight: '500' }}>
                                          {formatDate(payment.payment_date)}
                                        </td>
                                        <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', fontWeight: '700', color: '#059669', textAlign: 'right' }}>
                                          {formatCurrency(payment.amount)}
                                        </td>
                                        <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', color: '#64748b', fontWeight: '500' }}>
                                          {payment.payment_method}
                                        </td>
                                        <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', color: '#64748b' }}>
                                          {payment.reference_number || '-'}
                                        </td>
                                        {selectedEntry.billingStatus !== 'closed' && (
                                          <td style={{ padding: '1.125rem 1.5rem', textAlign: 'center' }}>
                                            <button
                                              onClick={() => handleDeletePayment(payment.id)}
                                              style={{
                                                padding: '0.5rem',
                                                backgroundColor: '#fee2e2',
                                                color: '#dc2626',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#fecaca'
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#fee2e2'
                                              }}
                                              title="Delete payment"
                                            >
                                              <Trash2 style={{ width: '1rem', height: '1rem' }} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
                              No payments recorded yet
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  
                  {/* Mark as Complete Button - Show when balance is fully paid */}
                  {(() => {
                    const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
                    const paymentsToUse = (selectedEntry.payments && Array.isArray(selectedEntry.payments) && selectedEntry.payments.length > 0) 
                      ? selectedEntry.payments 
                      : (payments && payments.length > 0 ? payments : [])
                    const totalPaid = selectedEntry.totalPaid !== undefined 
                      ? selectedEntry.totalPaid 
                      : paymentsToUse.reduce((sum, p) => sum + (p.amount || 0), 0)
                    const balanceDue = selectedEntry.balanceDue !== undefined
                      ? selectedEntry.balanceDue
                      : Math.max(0, netPayable - totalPaid)
                    const isFullyPaid = balanceDue <= 0.01
                    const isNotCompleted = selectedEntry.status !== 'completed'
                    
                    if (isFullyPaid && isNotCompleted && selectedEntry.billingStatus !== 'closed') {
                      return (
                        <div style={{ 
                          marginTop: '1.5rem', 
                          paddingTop: '1.5rem', 
                          borderTop: '2px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={handleMarkComplete}
                            disabled={updatingStatus}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.75rem 1.5rem',
                              backgroundColor: updatingStatus ? '#9ca3af' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.9375rem',
                              fontWeight: '600',
                              cursor: updatingStatus ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: updatingStatus ? 'none' : '0 2px 4px rgba(5, 150, 105, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              if (!updatingStatus) {
                                e.currentTarget.style.backgroundColor = '#047857'
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(5, 150, 105, 0.4)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!updatingStatus) {
                                e.currentTarget.style.backgroundColor = '#059669'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)'
                              }
                            }}
                          >
                            <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />
                            {updatingStatus ? 'Marking as Complete...' : 'Mark as Complete'}
                          </button>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>

                  </div>
                )}


                {/* Invoice Tab */}
                {activeDetailTab === 'invoice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Invoice Reconciliation Section */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '2rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    }}>
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '1.75rem',
                          paddingBottom: '1.25rem',
                          borderBottom: '2px solid #f1f5f9'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '3rem',
                              height: '3rem',
                              borderRadius: '0.75rem',
                              backgroundColor: '#dbeafe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                            }}>
                              <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                            </div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                              Invoice Reconciliation
                            </h3>
                          </div>
                  {!editingReconciliation && selectedEntry.invoiceNumber && (
                    <button
                      onClick={() => {
                        setEditingReconciliation(true)
                        setInvoiceDateInput(selectedEntry.invoiceDate || '')
                        setInvoiceAmountInput(selectedEntry.invoiceAmount?.toString() || '')
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb'
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      <Edit2 style={{ width: '1rem', height: '1rem' }} />
                      Edit
                    </button>
                  )}
                </div>
                <div style={{ 
                  backgroundColor: selectedEntry.invoiceNumber ? '#eff6ff' : '#f8fafc', 
                  borderRadius: '0.5rem', 
                  padding: '1.5rem',
                  border: selectedEntry.invoiceNumber ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                }}>
                  {editingReconciliation || !selectedEntry.invoiceNumber ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                          Invoice Number (External Platform) *
                      </label>
                        <input
                          type="text"
                          value={invoiceNumberInput}
                          onChange={(e) => setInvoiceNumberInput(e.target.value)}
                          placeholder="Enter invoice number from external platform"
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                            Invoice Date
                          </label>
                          <input
                            type="date"
                            value={invoiceDateInput}
                            onChange={(e) => setInvoiceDateInput(e.target.value)}
                          style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              backgroundColor: 'white'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                            Invoice Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={invoiceAmountInput}
                            onChange={(e) => setInvoiceAmountInput(e.target.value)}
                            placeholder="Amount from external invoice"
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              backgroundColor: 'white'
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                          Reconciliation Notes (Optional)
                        </label>
                        <textarea
                          value={reconciliationNotes}
                          onChange={(e) => setReconciliationNotes(e.target.value)}
                          placeholder="Notes about reconciliation, discrepancies, etc."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      {selectedEntry.invoiceAmount && selectedEntry.netPayable && Math.abs(selectedEntry.invoiceAmount - selectedEntry.netPayable) > 0.01 && (
                        <div style={{
                          padding: '0.75rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          color: '#dc2626'
                        }}>
                          <AlertCircle style={{ width: '1rem', height: '1rem' }} />
                          <div style={{ fontSize: '0.875rem' }}>
                            <strong>Mismatch detected:</strong> Invoice Amount (₹{selectedEntry.invoiceAmount.toFixed(2)}) ≠ OMS Amount (₹{selectedEntry.netPayable.toFixed(2)})
                            <br />
                            Difference: ₹{Math.abs(selectedEntry.invoiceAmount - selectedEntry.netPayable).toFixed(2)}
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditingReconciliation(false)
                            setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                            setInvoiceDateInput(selectedEntry.invoiceDate || '')
                            setInvoiceAmountInput(selectedEntry.invoiceAmount?.toString() || '')
                            setReconciliationNotes('')
                          }}
                          style={{
                            padding: '0.625rem 1rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                          <button
                          onClick={handleSaveReconciliation}
                          disabled={savingReconciliation || !invoiceNumberInput.trim()}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.625rem 1rem',
                            backgroundColor: savingReconciliation || !invoiceNumberInput.trim() ? '#9ca3af' : '#059669',
                            color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                            cursor: savingReconciliation || !invoiceNumberInput.trim() ? 'not-allowed' : 'pointer'
                            }}
                          >
                          <Save style={{ width: '1rem', height: '1rem' }} />
                          {savingReconciliation ? 'Saving...' : 'Save'}
                          </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Invoice Number</div>
                          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0c4a6e' }}>
                            {selectedEntry.invoiceNumber}
                      </div>
                        </div>
                        {selectedEntry.invoiceDate && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Invoice Date</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {formatDate(selectedEntry.invoiceDate)}
                            </div>
                          </div>
                        )}
                        {selectedEntry.invoiceAmount && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Invoice Amount</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {formatCurrency(selectedEntry.invoiceAmount)}
                            </div>
                          </div>
                        )}
                        {selectedEntry.netPayable && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>OMS Amount</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {formatCurrency(selectedEntry.netPayable)}
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedEntry.invoiceAmount && selectedEntry.netPayable && Math.abs(selectedEntry.invoiceAmount - selectedEntry.netPayable) > 0.01 && (
                      <div style={{ 
                          padding: '0.75rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#dc2626',
                          marginTop: '1rem'
                        }}>
                          <AlertCircle style={{ width: '1rem', height: '1rem' }} />
                          <div style={{ fontSize: '0.875rem' }}>
                            <strong>Mismatch:</strong> Invoice (₹{selectedEntry.invoiceAmount.toFixed(2)}) ≠ OMS (₹{selectedEntry.netPayable.toFixed(2)})
                            <br />
                            Difference: ₹{Math.abs(selectedEntry.invoiceAmount - selectedEntry.netPayable).toFixed(2)}
                      </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

                      {/* Invoice References */}
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LinkIcon style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  Invoice References (Optional)
                </h3>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                  {/* Add Invoice Link */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Paste invoice link (URL)"
                        value={invoiceLink}
                        onChange={(e) => setInvoiceLink(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                      <button
                        onClick={handleAddInvoiceLink}
                        disabled={!invoiceLink.trim() || invoiceLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: invoiceLoading || !invoiceLink.trim() ? '#9ca3af' : '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: invoiceLoading || !invoiceLink.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <LinkIcon style={{ width: '1rem', height: '1rem' }} />
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Upload Invoice File */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: invoiceFile ? '#111827' : '#9ca3af'
                        }}
                      >
                        <Upload style={{ width: '1rem', height: '1rem' }} />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                          style={{ display: 'none' }}
                        />
                        {invoiceFile ? invoiceFile.name : 'Upload Invoice (PDF/Image)'}
                      </label>
                      <button
                        onClick={handleUploadInvoice}
                        disabled={!invoiceFile || invoiceLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: invoiceLoading || !invoiceFile ? '#9ca3af' : '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: invoiceLoading || !invoiceFile ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Upload style={{ width: '1rem', height: '1rem' }} />
                        Upload
                      </button>
                    </div>
                  </div>

                  {/* Display Invoice References */}
                  {invoiceReferences.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                        Added References:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {invoiceReferences.map((ref, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {ref.type === 'link' ? (
                              <LinkIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                            ) : (
                              <FileImage style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                            )}
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                fontSize: '0.875rem',
                                color: '#2563eb',
                                textDecoration: 'none'
                              }}
                            >
                              {ref.fileName || ref.url.substring(0, 50)}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments Tab */}
                {activeDetailTab === 'comments' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.875rem', 
                      padding: '1.75rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <VehicleCommentsSection vehicleId={selectedEntry.id} userRole={userRole} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedEntry && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          entryId={selectedEntry.id}
          balanceDue={(() => {
            const netPayable = selectedEntry.netPayable || (selectedEntry.totalAmount - (selectedEntry.discountAmount || 0) + (selectedEntry.taxAmount || 0)) || selectedEntry.finalAmount || selectedEntry.totalAmount || 0
            const totalPaid = selectedEntry.totalPaid !== undefined 
              ? selectedEntry.totalPaid 
              : (selectedEntry.payments?.reduce((sum, p) => sum + p.amount, 0) || payments.reduce((sum, p) => sum + p.amount, 0) || 0)
            return selectedEntry.balanceDue !== undefined 
              ? selectedEntry.balanceDue 
              : Math.max(0, netPayable - totalPaid)
          })()}
          onPaymentAdded={handlePaymentAdded}
        />
      )}
    </div>
  )
}

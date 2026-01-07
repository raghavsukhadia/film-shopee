'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Car, Wrench, DollarSign, FileText, Plus, Filter, Eye, Edit, Trash2, Calendar, Phone, Mail, CheckCircle, Percent, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VehicleDetailsModal from './components/VehicleDetailsModal'
import JobSheetPrint from '@/components/shared/JobSheetPrint'
import { notificationWorkflow } from '@/lib/services/notification-workflow'
import { checkUserRole, canModifyVehicles, canViewReports, type UserRole } from '@/lib/helpers/rbac'
import { exportToExcel, formatCurrency, formatDate, formatDateTime, type ExcelColumn } from '@/lib/services/excel-export'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/helpers/tenant-context'
import { logger } from '@/lib/utils/logger'

export default function VehiclesPageClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState<any>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [vehicles, setVehicles] = useState<any[]>([])

  // Load user role
  useEffect(() => {
    loadUserRole()
    fetchVehicles()
  }, [])

  const loadUserRole = async () => {
    const profile = await checkUserRole()
    if (profile) {
      setUserRole(profile.role)
    }
  }

  const fetchVehicles = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // First fetch sorted by created_at ascending to assign sequential IDs correctly
      // (oldest entry = Z01, newest entry = Znn)
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .order('created_at', { ascending: true })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        logger.error('Error fetching vehicles', error, 'VehiclesPageClient')
        // Keep mock data if database fails
        return
      }

      if (data && data.length > 0) {
        // Map database data to display format with sequential IDs
        // IDs are assigned based on creation order (oldest = Z01)
        const mappedVehicles = data.map((v: any, index: number) => {
          // Generate sequential ID: Z01, Z02, Z03, etc. based on creation order
          const sequentialId = `Z${String(index + 1).padStart(2, '0')}`
          // Parse discount info from notes field
          let hasDiscount = false
          let discountAmount = 0
          let discountPercentage = 0
          let discountOfferedBy = ''
          
          if (v.notes) {
            try {
              const notesData = JSON.parse(v.notes)
              if (notesData.discount && notesData.discount.discount_amount) {
                hasDiscount = parseFloat(notesData.discount.discount_amount) > 0
                discountAmount = parseFloat(notesData.discount.discount_amount) || 0
                discountPercentage = notesData.discount.discount_percentage || 0
                discountOfferedBy = notesData.discount.discount_offered_by || ''
              }
            } catch {
              // If parsing fails, discount info not in notes
            }
          }
          
          // Check if accountant has marked as complete
          const isAccountantComplete = v.status === 'completed'
          
          return {
            id: v.id,
            shortId: sequentialId, // Use sequential ID (Z01, Z02, etc.)
            regNo: v.registration_number || 'N/A',
            make: v.make && v.make !== 'Unknown' ? v.make : 'N/A',
            model: v.model || 'N/A',
            year: v.year,
            color: v.color,
            customer: v.customer_name || 'N/A',
            customerPhone: v.customer_phone,
            customerEmail: v.customer_email,
            customerAddress: v.customer_address,
            customerCity: v.customer_city,
            customerState: v.customer_state,
            customerPincode: v.customer_pincode,
            status: v.status || 'pending',
            date: new Date(v.created_at).toISOString().split('T')[0],
            issues: v.issues_reported,
            accessories: v.accessories_requested,
            estimatedCost: v.estimated_cost,
            priority: v.priority,
            odometerReading: v.odometer_reading,
            totalServices: v.total_services || 0,
            nextService: v.next_service_date || 'N/A',
            // Accountant and discount indicators
            isAccountantComplete,
            hasDiscount,
            discountAmount,
            discountPercentage,
            discountOfferedBy,
            // Store full data for editing
            fullData: v,
            // Store created_at for sorting
            created_at: v.created_at
          }
        })
        
        // Sort by date descending (newest first) for display, while preserving sequential IDs
        const sortedVehicles = mappedVehicles.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA // Descending order (newest first)
        })
        
        setVehicles(sortedVehicles)
      }
    } catch (error) {
      logger.error('Error loading vehicles', error, 'VehiclesPageClient')
    }
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.customer.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Define final statuses that should only appear in their specific tabs
    // Only "Delivered" is final - "Completed" can still be edited
    const finalStatuses = ['delivered', 'complete_and_delivered']
    const vehicleStatus = vehicle.status?.toLowerCase().trim() || ''
    
    let matchesTab = false
    if (activeTab === 'all') {
      // Exclude only delivered from "All" tab (completed can appear in "All")
      matchesTab = !finalStatuses.includes(vehicleStatus)
    } else {
      // Show vehicles matching the selected tab
      matchesTab = vehicleStatus === activeTab || 
                   (activeTab === 'completed' && (vehicleStatus === 'completed' || vehicleStatus === 'complete_and_delivered')) ||
                   (activeTab === 'delivered' && (vehicleStatus === 'delivered' || vehicleStatus === 'complete_and_delivered'))
    }

    return matchesSearch && matchesTab
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'; // Amber
      case 'in_progress': return '#f59e0b'; // Amber
      case 'under_installation': return '#7c3aed'; // Purple
      case 'installation_complete': return '#10b981'; // Emerald
      case 'completed': return '#059669'; // Green
      case 'delivered': return '#16a34a'; // Dark Green
      default: return '#64748b'; // Gray
    }
  }

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  const handleSelectAll = () => {
    if (selectedVehicles.length === filteredVehicles.length) {
      setSelectedVehicles([])
    } else {
      setSelectedVehicles(filteredVehicles.map(v => v.id))
    }
  }

  const handleExportVehicles = () => {
    try {
      // Determine which vehicles to export (selected or all filtered)
      const vehiclesToExport = selectedVehicles.length > 0
        ? filteredVehicles.filter(v => selectedVehicles.includes(v.id))
        : filteredVehicles

      if (vehiclesToExport.length === 0) {
        alert('No vehicles to export. Please select vehicles or ensure there are vehicles in the current view.')
        return
      }

      // Format status for display
      const formatStatus = (status: string) => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending',
          'in_progress': 'In Progress',
          'under_installation': 'Under Installation',
          'installation_complete': 'Installation Complete',
          'completed': 'Completed',
          'delivered': 'Delivered',
          'complete_and_delivered': 'Complete & Delivered'
        }
        return statusMap[status] || status
      }

      // Format priority for display
      const formatPriority = (priority: string) => {
        const priorityMap: { [key: string]: string } = {
          'low': 'Low',
          'medium': 'Medium',
          'high': 'High',
          'urgent': 'Urgent'
        }
        return priorityMap[priority] || priority || 'Medium'
      }

      // Prepare columns
      const columns: ExcelColumn[] = [
        { header: 'ID', key: 'shortId', width: 8 },
        { header: 'Registration Number', key: 'regNo', width: 20 },
        { header: 'Make', key: 'make', width: 15 },
        { header: 'Model', key: 'model', width: 20 },
        { header: 'Year', key: 'year', width: 8 },
        { header: 'Color', key: 'color', width: 12 },
        { header: 'Customer Name', key: 'customer', width: 20 },
        { header: 'Customer Phone', key: 'customerPhone', width: 15 },
        { header: 'Customer Email', key: 'customerEmail', width: 25 },
        { header: 'Status', key: 'status', width: 18, format: (v) => formatStatus(v) },
        { header: 'Priority', key: 'priority', width: 12, format: (v) => formatPriority(v) },
        { header: 'Issues Reported', key: 'issues', width: 30 },
        { header: 'Odometer Reading', key: 'odometerReading', width: 15 },
        { header: 'Estimated Cost', key: 'estimatedCost', width: 15, format: (v) => v ? formatCurrency(v) : 'N/A' },
        { header: 'Date Created', key: 'date', width: 15, format: (v) => formatDate(v) },
        { header: 'Accessories Requested', key: 'accessories', width: 30 }
      ]

      // Export to Excel
      exportToExcel({
        filename: `vehicles_export_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Vehicles',
        title: 'Vehicle Management Export',
        subtitle: `Total Vehicles: ${vehiclesToExport.length} | Filter: ${activeTab === 'all' ? 'All' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`,
        columns,
        data: vehiclesToExport,
        includeDate: true
      })

      // Show success message
      alert(`Successfully exported ${vehiclesToExport.length} vehicle(s) to Excel!`)
    } catch (error: any) {
      logger.error('Error exporting vehicles', error, 'VehiclesPageClient')
      alert(`Failed to export vehicles: ${error.message || 'Unknown error'}`)
    }
  }

  const handleStatusUpdate = async (vehicleId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase is not configured. Please check your environment variables.')
      }

      // Update vehicle inward status in database
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      logger.debug('Updating vehicle inward status', { vehicleId, newStatus }, 'VehiclesPageClient')
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await updateQuery.select()

      logger.debug('Update result', { hasData: !!data, hasError: !!error }, 'VehiclesPageClient')

      if (error) {
        logger.error('Supabase error', error, 'VehiclesPageClient')
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }

      // Check if any rows were updated
      if (!data || data.length === 0) {
        throw new Error(`No vehicle inward record found with ID: ${vehicleId}`)
      }

      // Update local state
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, status: newStatus }
          : vehicle
      ))

      // Send WhatsApp notification if status is delivered
      if (newStatus === 'delivered' || newStatus === 'complete_and_delivered') {
        try {
          const vehicleData = data[0]
          if (vehicleData) {
            await notificationWorkflow.notifyVehicleDelivered(vehicleId, vehicleData)
          }
        } catch (notifError) {
          logger.error('Error sending notification', notifError, 'VehiclesPageClient')
          // Don't block success if notification fails
        }
      }

      const statusName = newStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      alert(`Status updated to: ${statusName}`)
      
    } catch (error: any) {
      logger.error('Error updating vehicle status', error, 'VehiclesPageClient')
      alert(`Failed to update vehicle status: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteVehicle = async (vehicleId: string, regNo: string) => {
    if (confirm(`Are you sure you want to delete this vehicle inward record? This action cannot be undone.`)) {
      try {
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        // Delete from vehicle_inward table using ID
        let deleteQuery = supabase
          .from('vehicle_inward')
          .delete()
          .eq('id', vehicleId)
        
        // Add tenant filter for security
        if (!isSuper && tenantId) {
          deleteQuery = deleteQuery.eq('tenant_id', tenantId)
        }
        
        const { error } = await deleteQuery

        if (error) {
          logger.error('Supabase error', error, 'VehiclesPageClient')
          throw new Error(`Database error: ${error.message}`)
        }

        // Update local state
        setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId))
        alert('Record deleted successfully')
        
        // Refresh the list
        fetchVehicles()
        
      } catch (error: any) {
        logger.error('Error deleting vehicle', error, 'VehiclesPageClient')
        alert(`Failed to delete record: ${error.message}`)
      }
    }
  }

  const handleEditVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (vehicle && vehicle.fullData) {
      // Navigate to edit page with vehicle data
      const encodedData = encodeURIComponent(JSON.stringify(vehicle.fullData))
      router.push(`/inward/edit?id=${vehicleId}`)
    } else {
      alert('Vehicle data not available for editing')
    }
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {showDetailsModal && selectedVehicleDetails && (
        <VehicleDetailsModal
          vehicle={selectedVehicleDetails}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedVehicleDetails(null)
          }}
          onUpdate={() => {
            fetchVehicles() // Refresh the list after any updates
          }}
        />
      )}
      {showPrintModal && selectedVehicleForPrint && (
        <JobSheetPrint
          vehicle={selectedVehicleForPrint}
          onClose={() => {
            setShowPrintModal(false)
            setSelectedVehicleForPrint(null)
          }}
        />
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Vehicle Management</h1>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
            Manage vehicle records, service history, and customer information
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleExportVehicles}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(5,150,105,0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#047857'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(5,150,105,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#059669'
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(5,150,105,0.2)'
            }}
          >
            <FileText style={{ width: '1rem', height: '1rem' }} />
            Export to Excel
          </button>
          {(userRole === 'admin' || userRole === 'manager' || userRole === 'coordinator') && (
            <button 
              onClick={() => router.push('/inward/new')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(37,99,235,0.2)',
                transition: 'all 0.2s'
              }}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Car style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{vehicles.length}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Vehicles</div>
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wrench style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
              {vehicles.filter(v => ['in_progress', 'under_installation'].includes(v.status)).length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>In Progress</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
              {vehicles.filter(v => ['completed', 'delivered'].includes(v.status)).length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', width: '400px' }}>
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
              placeholder="Search vehicles by registration, make, model, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                width: '100%',
                outline: 'none',
                backgroundColor: 'white',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f59e0b'
                e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => alert('Advanced filters')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <Filter style={{ width: '1rem', height: '1rem' }} />
              Filters
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'pending', 'in_progress', 'under_installation', 'installation_complete', 'completed', 'delivered'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                backgroundColor: activeTab === tab ? '#f59e0b' : 'white',
                color: activeTab === tab ? 'white' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {tab.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569', width: '50px' }}>
                <input
                  type="checkbox"
                  checked={selectedVehicles.length === filteredVehicles.length && filteredVehicles.length > 0}
                  onChange={handleSelectAll}
                  style={{ width: '1rem', height: '1rem' }}
                />
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Date</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Vehicle</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Customer</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Contact</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Service Info</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No vehicles found.</td>
              </tr>
            ) : (
              filteredVehicles.map((vehicle, index) => {
                // Determine if row should have special styling
                const isSpecialRow = vehicle.isAccountantComplete || vehicle.hasDiscount
                const rowBgColor = isSpecialRow ? '#fef3c7' : 'transparent' // Light amber background for special rows
                const rowBorderColor = isSpecialRow ? '#fbbf24' : '#f1f5f9' // Amber border for special rows
                
                return (
                <tr 
                  key={vehicle.id} 
                  style={{ 
                    borderBottom: index === filteredVehicles.length - 1 ? 'none' : `2px solid ${rowBorderColor}`,
                    backgroundColor: rowBgColor,
                    borderLeft: isSpecialRow ? '4px solid #fbbf24' : 'none'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedVehicles.includes(vehicle.id)}
                      onChange={() => handleSelectVehicle(vehicle.id)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {vehicle.shortId || vehicle.id}
                      {/* Visual Indicators */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {vehicle.isAccountantComplete && (
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.125rem 0.375rem',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              border: '1px solid #86efac'
                            }}
                            title="Accountant marked as complete"
                          >
                            <CheckCircle style={{ width: '0.625rem', height: '0.625rem' }} />
                            Accountant
                          </span>
                        )}
                        {vehicle.hasDiscount && (
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.125rem 0.375rem',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              border: '1px solid #fde68a'
                            }}
                            title={`Discount: Rs. ${vehicle.discountAmount} (${vehicle.discountPercentage.toFixed(1)}%)`}
                          >
                            <Percent style={{ width: '0.625rem', height: '0.625rem' }} />
                            Discount
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                    {vehicle.date ? formatDate(vehicle.date) : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{vehicle.model}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{vehicle.regNo}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {vehicle.year ? `${vehicle.year} � ` : ''}{vehicle.color}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{vehicle.customer}</div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <a href={`tel:${vehicle.customerPhone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#f59e0b', textDecoration: 'none' }}>
                        <Phone style={{ width: '0.75rem', height: '0.75rem', color: '#64748b' }} />
                        {vehicle.customerPhone}
                      </a>
                      <a href={`mailto:${vehicle.customerEmail}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#f59e0b', textDecoration: 'none' }}>
                        <Mail style={{ width: '0.75rem', height: '0.75rem', color: '#64748b' }} />
                        {vehicle.customerEmail || 'N/A'}
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {(() => {
                      const vehicleStatus = vehicle.status?.toLowerCase().trim() || ''
                      // Only "Delivered" is final - "Completed" can be edited
                      const isFinalStatus = ['delivered', 'complete_and_delivered'].includes(vehicleStatus)
                      
                      if (isFinalStatus) {
                        // Read-only display for delivered status (final stage)
                        return (
                          <div style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            minWidth: '150px',
                            textAlign: 'center',
                            border: '1px solid #e5e7eb',
                            cursor: 'not-allowed',
                            fontStyle: 'italic'
                          }}>
                            {vehicle.status.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (Final)
                          </div>
                        )
                      }
                      
                      // Editable dropdown for other statuses
                      // If accountant complete, highlight "Delivered" option prominently
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <select
                            value={vehicle.status}
                            onChange={(e) => handleStatusUpdate(vehicle.id, e.target.value)}
                            disabled={isUpdating}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              border: vehicle.isAccountantComplete ? '2px solid #059669' : '1px solid #e2e8f0',
                              fontSize: '0.75rem',
                              backgroundColor: vehicle.isAccountantComplete ? '#f0fdf4' : 'white',
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                              minWidth: '150px',
                              fontWeight: vehicle.isAccountantComplete ? '600' : '400'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="under_installation">Under Installation</option>
                            <option value="installation_complete">Installation Complete</option>
                            <option value="completed">Completed</option>
                            <option value="delivered" style={{ fontWeight: 'bold', backgroundColor: '#dcfce7' }}>
                              {vehicle.isAccountantComplete ? '? Mark as Delivered' : 'Delivered'}
                            </option>
                          </select>
                          {vehicle.isAccountantComplete && (
                            <div style={{ 
                              fontSize: '0.625rem', 
                              color: '#059669',
                              fontStyle: 'italic',
                              fontWeight: '500'
                            }}>
                              Ready to mark as Delivered
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '250px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.75rem' }}>
                        <strong>Issue:</strong> {vehicle.issues || 'N/A'}
                      </div>
                      {vehicle.estimatedCost && (
                        <div style={{ fontSize: '0.75rem' }}>
                          <strong>Cost:</strong> Rs. {vehicle.estimatedCost}
                        </div>
                      )}
                      {vehicle.hasDiscount && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#92400e',
                          backgroundColor: '#fef3c7',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          border: '1px solid #fde68a',
                          fontWeight: '600'
                        }}>
                          <strong>Discount:</strong> Rs. {vehicle.discountAmount} ({vehicle.discountPercentage.toFixed(1)}%)
                          {vehicle.discountOfferedBy && ` by ${vehicle.discountOfferedBy}`}
                        </div>
                      )}
                      {vehicle.odometerReading && (
                        <div style={{ fontSize: '0.75rem' }}>
                          <strong>Odometer:</strong> {vehicle.odometerReading} km
                        </div>
                      )}
                      {vehicle.isAccountantComplete && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#166534',
                          backgroundColor: '#dcfce7',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          border: '1px solid #86efac',
                          fontWeight: '600',
                          marginTop: '0.25rem'
                        }}>
                          ? Ready for Delivery
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {(() => {
                      const vehicleStatus = vehicle.status?.toLowerCase().trim() || ''
                      const isDelivered = ['delivered', 'complete_and_delivered'].includes(vehicleStatus)
                      
                      // Role-based permissions
                      const canEdit = canModifyVehicles(userRole || 'coordinator')
                      const canDelete = userRole === 'admin' || userRole === 'manager'
                      const canEditDelivered = userRole === 'admin' // Only admin can edit/delete delivered vehicles
                      
                      // Disable edit/delete for non-admins when vehicle is delivered
                      const shouldDisableEdit = !canEditDelivered && isDelivered
                      const shouldDisableDelete = !canDelete || (!canEditDelivered && isDelivered)
                      
                      return (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* View button - all roles can view */}
                          <button 
                            onClick={() => {
                              setSelectedVehicleDetails(vehicle.fullData)
                              setShowDetailsModal(true)
                            }}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                            title="View Details"
                          >
                            <Eye style={{ width: '0.75rem', height: '0.75rem' }} />
                          </button>
                          
                          {/* Print button - all roles can print */}
                          <button 
                            onClick={() => {
                              setSelectedVehicleForPrint(vehicle.fullData)
                              setShowPrintModal(true)
                            }}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#7c3aed',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                            title="Print Job Sheet"
                          >
                            <Printer style={{ width: '0.75rem', height: '0.75rem' }} />
                          </button>
                          
                          {/* Edit button - only for roles that can modify vehicles */}
                          {canEdit && (
                            <button 
                              onClick={() => {
                                if (!shouldDisableEdit) {
                                  handleEditVehicle(vehicle.id)
                                }
                              }}
                              disabled={shouldDisableEdit}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: shouldDisableEdit ? '#9ca3af' : '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: shouldDisableEdit ? 'not-allowed' : 'pointer',
                                boxShadow: shouldDisableEdit ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: shouldDisableEdit ? 0.6 : 1
                              }}
                              title={shouldDisableEdit ? 'Cannot edit delivered vehicles' : 'Edit Customer Details'}
                            >
                              <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                            </button>
                          )}
                          
                          {/* Delete button - only for admin and manager */}
                          {canDelete && (
                            <button 
                              onClick={() => {
                                if (!shouldDisableDelete) {
                                  handleDeleteVehicle(vehicle.id, vehicle.regNo)
                                }
                              }}
                              disabled={shouldDisableDelete}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: shouldDisableDelete ? '#9ca3af' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                cursor: shouldDisableDelete ? 'not-allowed' : 'pointer',
                                opacity: shouldDisableDelete ? 0.6 : 1
                              }}
                              title={shouldDisableDelete ? 'Cannot delete delivered vehicles' : 'Delete'}
                            >
                              <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {selectedVehicles.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span>{selectedVehicles.length} vehicles selected</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => alert(`Export ${selectedVehicles.length} vehicles`)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#f59e0b',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Export
            </button>
            <button
              onClick={() => alert(`Delete ${selectedVehicles.length} vehicles?`)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

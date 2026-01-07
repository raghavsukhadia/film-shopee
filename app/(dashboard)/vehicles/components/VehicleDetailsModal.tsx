'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Car, MapPin, Wrench, DollarSign, Calendar, MessageSquare, Send, Package, Edit, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VehicleCommentsSection from '@/components/vehicles/VehicleCommentsSection'
import { isUUID } from '@/lib/utils/legacy'

interface VehicleInward {
  id: string
  short_id?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_state?: string
  customer_pincode?: string
  registration_number?: string
  make?: string
  model?: string
  color?: string
  year?: number
  vehicle_type?: string
  engine_number?: string
  chassis_number?: string
  odometer_reading?: number
  issues_reported?: string
  accessories_requested?: string
  estimated_cost?: number
  priority?: string
  assigned_installer_id?: string
  assigned_manager_id?: string
  location_id?: string
  estimated_completion_date?: string
  notes?: string
  status?: string
  created_at?: string
  updated_at?: string
}

interface VehicleDetailsModalProps {
  vehicle: VehicleInward
  onClose: () => void
  onUpdate?: () => void
}

export default function VehicleDetailsModal({ vehicle, onClose, onUpdate }: VehicleDetailsModalProps) {
  const supabase = createClient()
  
  // State for fetching names
  const [managerName, setManagerName] = useState<string>('Loading...')
  const [locationName, setLocationName] = useState<string>('Loading...')
  const [vehicleTypeName, setVehicleTypeName] = useState<string>('Loading...')
  const [installerName, setInstallerName] = useState<string>('')
  const [products, setProducts] = useState<any[]>([])
  const [currentStatus, setCurrentStatus] = useState<string>(vehicle.status || 'pending')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch related data
  useEffect(() => {
    fetchRelatedData()
    parseProducts()
  }, [vehicle])

  const fetchRelatedData = async () => {
    try {
      // Fetch Manager Name
      if (vehicle.assigned_manager_id) {
        const { data: managerData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', vehicle.assigned_manager_id)
          .single()
        setManagerName(managerData?.name || 'Not Assigned')
      } else {
        setManagerName('Not Assigned')
      }

      // Fetch Location Name
      if (vehicle.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', vehicle.location_id)
          .single()
        setLocationName(locationData?.name || 'Not Specified')
      } else {
        setLocationName('Not Specified')
      }

      // Fetch Vehicle Type Name
      if (vehicle.vehicle_type) {
        try {
          const { data: vehicleTypeData, error: vehicleTypeError } = await supabase
            .from('vehicle_types')
            .select('name')
            .eq('id', vehicle.vehicle_type)
            .single()
          
          if (vehicleTypeError || !vehicleTypeData) {
            // If lookup failed and vehicle_type is a UUID, show "Not Specified"
            if (isUUID(vehicle.vehicle_type)) {
              setVehicleTypeName('Not Specified')
            } else {
              // If it's not a UUID, it might be a name, use it
              setVehicleTypeName(vehicle.vehicle_type)
            }
          } else {
            setVehicleTypeName(vehicleTypeData.name || 'Not Specified')
          }
        } catch (error) {
          console.error('Error fetching vehicle type:', error)
          // If error and vehicle_type is a UUID, show "Not Specified"
          if (isUUID(vehicle.vehicle_type)) {
            setVehicleTypeName('Not Specified')
          } else {
            setVehicleTypeName(vehicle.vehicle_type)
          }
        }
      } else {
        setVehicleTypeName('Not Specified')
      }

      // Fetch Installer Name
      if (vehicle.assigned_installer_id) {
        const { data: installerData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', vehicle.assigned_installer_id)
          .single()
        setInstallerName(installerData?.name || 'Not Assigned')
      }
    } catch (error) {
      console.error('Error fetching related data:', error)
      setManagerName('Error loading')
      setLocationName('Error loading')
      setVehicleTypeName('Error loading')
    }
  }

  const parseProducts = async () => {
    if (vehicle.accessories_requested) {
      try {
        const parsed = JSON.parse(vehicle.accessories_requested)
        if (Array.isArray(parsed)) {
          // Fetch department names for each product
          const productsWithDeptNames = await Promise.all(parsed.map(async (product: any) => {
            if (product.department && typeof product.department === 'string' && product.department.includes('-')) {
              // It's a UUID, fetch the department name
              try {
                const { data: deptData } = await supabase
                  .from('departments')
                  .select('name')
                  .eq('id', product.department)
                  .single()
                
                return {
                  ...product,
                  department: deptData?.name || product.department
                }
              } catch {
                return product
              }
            }
            return product
          }))
          setProducts(productsWithDeptNames)
        } else {
          setProducts([])
        }
      } catch {
        // If not JSON, treat as plain text
        setProducts([])
      }
    } else {
      setProducts([])
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (isUpdatingStatus) return
    
    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('vehicle_inward')
        .update({ status: newStatus })
        .eq('id', vehicle.id)

      if (error) throw error

      setCurrentStatus(newStatus)
      if (onUpdate) onUpdate()
      alert('Status updated successfully!')
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusOptions = () => {
    const status = currentStatus.toLowerCase()
    if (status === 'pending') return ['In Progress']
    if (status === 'in_progress') return ['Under Installation']
    if (status === 'under_installation') return ['Installation Complete']
    if (status === 'installation_complete') return ['Complete and Delivered']
    return []
  }

  const statusOptions = getStatusOptions()

  const statusColors = {
    'pending': { bg: '#fef3c7', text: '#92400e' },
    'in_progress': { bg: '#dbeafe', text: '#1e40af' },
    'under_installation': { bg: '#f3e8ff', text: '#7c3aed' },
    'installation_complete': { bg: '#d1fae5', text: '#059669' },
    'complete_and_delivered': { bg: '#dcfce7', text: '#166534' },
    'completed': { bg: '#dcfce7', text: '#166534' },
    'delivered': { bg: '#bbf7d0', text: '#15803d' }
  }

  const priorityColors = {
    'low': { bg: '#dcfce7', text: '#166534' },
    'medium': { bg: '#fef3c7', text: '#92400e' },
    'high': { bg: '#fee2e2', text: '#dc2626' },
    'urgent': { bg: '#fecaca', text: '#991b1b' }
  }

  const currentPriority = vehicle.priority || 'medium'
  const statusColor = statusColors[currentStatus as keyof typeof statusColors] || { bg: '#f1f5f9', text: '#64748b' }
  const priorityColor = priorityColors[currentPriority as keyof typeof priorityColors] || { bg: '#f1f5f9', text: '#64748b' }

  // Helper function to format notes (handles JSON parsing)
  const formatNotes = (notes: string): string => {
    try {
      const parsed = JSON.parse(notes)
      if (typeof parsed === 'object' && parsed !== null) {
        // Format JSON object into readable text
        const formatObject = (obj: any, indent = 0): string => {
          let result = ''
          for (const [key, value] of Object.entries(obj)) {
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              result += `${'  '.repeat(indent)}${formattedKey}:\n`
              result += formatObject(value, indent + 1)
            } else if (Array.isArray(value)) {
              result += `${'  '.repeat(indent)}${formattedKey}: ${value.join(', ')}\n`
            } else {
              const displayValue = value === '' ? '(Empty)' : value
              result += `${'  '.repeat(indent)}${formattedKey}: ${displayValue}\n`
            }
          }
          return result
        }
        return formatObject(parsed).trim()
      }
    } catch {
      // If not valid JSON, use as-is
    }
    return notes
  }

  return (
    <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
      onClick={onClose}
      >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.875rem',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
          <div style={{
            padding: '2rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '1.875rem', 
                fontWeight: '700', 
                color: '#111827', 
                margin: 0,
                marginBottom: '0.75rem',
                letterSpacing: '-0.025em'
              }}>
                Vehicle Inward Details
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Entry ID: <span style={{ color: '#111827', fontWeight: '600' }}>{vehicle.short_id || vehicle.id?.substring(0, 8)}</span>
                </span>
                <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>•</span>
                <span style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.text}20`
                }}>
                  {currentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <span style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: priorityColor.bg,
                  color: priorityColor.text,
                  border: `1px solid ${priorityColor.text}20`
                }}>
                  Priority: {currentPriority.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem', color: '#64748b' }} />
            </button>
          </div>

        {/* Content */}
        <div style={{
          padding: '2rem',
          overflowY: 'auto',
          flex: 1,
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status Update Section */}
            {statusOptions.length > 0 && (
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
                  marginBottom: '1.5rem',
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
                    <Edit style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Update Status
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleStatusUpdate(e.target.value)
                    }}
                    disabled={isUpdatingStatus}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontWeight: '500'
                    }}
                  >
                    <option value="">Select new status...</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status.toLowerCase().replace(/\s+/g, '_')}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {isUpdatingStatus && (
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Updating...</span>
                  )}
                </div>
              </div>
            )}

            {/* Single Column Layout */}
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
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.customer_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                      <a href={`tel:${vehicle.customer_phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {vehicle.customer_phone || 'N/A'}
                      </a>
                    </div>
                  </div>
                  {vehicle.customer_email && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                        <a href={`mailto:${vehicle.customer_email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                          {vehicle.customer_email}
                        </a>
                      </div>
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
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration Number</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.registration_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.make || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.model || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Type</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicleTypeName}</div>
                  </div>
                  {vehicle.year && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.year}</div>
                    </div>
                  )}
                  {vehicle.color && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.color}</div>
                    </div>
                  )}
                  {vehicle.odometer_reading && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Odometer Reading</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{vehicle.odometer_reading.toLocaleString('en-IN')} km</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created Date</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                      {vehicle.created_at ? new Date(vehicle.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Details Card */}
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
                    <Wrench style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Assignment Details
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Manager</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{managerName}</div>
                  </div>
                  {installerName && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installer</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>{installerName}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                      {locationName}
                    </div>
                  </div>
                  {vehicle.estimated_completion_date && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Completion</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                        {new Date(vehicle.estimated_completion_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cost & Revenue Card */}
              {vehicle.estimated_cost !== undefined && vehicle.estimated_cost !== null && (
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
                      backgroundColor: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)'
                    }}>
                      <DollarSign style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Cost & Revenue
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Cost</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>₹{vehicle.estimated_cost?.toLocaleString('en-IN') || '0'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: currentStatus === 'complete_and_delivered' || currentStatus === 'completed' ? '#059669' : '#dc2626' }}>
                        {currentStatus === 'complete_and_delivered' || currentStatus === 'completed' ? 'Paid' : 'Pending Payment'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Details Card */}
              {products.length > 0 && (
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
                      backgroundColor: '#f3e8ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(124, 58, 237, 0.1)'
                    }}>
                      <Package style={{ width: '1.5rem', height: '1.5rem', color: '#7c3aed' }} />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Product Details
                    </h3>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Product</th>
                          <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Brand</th>
                          <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Department</th>
                          <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product, index) => (
                          <tr key={index} style={{ 
                            borderBottom: index === products.length - 1 ? 'none' : '1px solid #e5e7eb',
                            backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8fafc'
                          }}
                          >
                            <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', fontWeight: '500', color: '#111827' }}>{product.product || '-'}</td>
                            <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', color: '#64748b' }}>{product.brand || '-'}</td>
                            <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', color: '#64748b' }}>{product.department || '-'}</td>
                            <td style={{ padding: '1.125rem 1.5rem', fontSize: '0.9375rem', fontWeight: '600', color: '#059669', textAlign: 'right' }}>₹{parseFloat(product.price || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invoice Number Card */}
              {(() => {
                let invoiceNumber = ''
                if (vehicle.notes) {
                  try {
                    const notesData = JSON.parse(vehicle.notes)
                    if (notesData.invoice_number) {
                      invoiceNumber = notesData.invoice_number
                    }
                  } catch {
                    // If parsing fails, invoice number remains empty
                  }
                }
                
                if (invoiceNumber) {
                  return (
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
                          backgroundColor: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                        }}>
                          <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          Invoice Information
                        </h3>
                      </div>
                      <div style={{ 
                        backgroundColor: '#eff6ff', 
                        padding: '1.5rem', 
                        borderRadius: '0.75rem',
                        border: '1px solid #bfdbfe'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Invoice Number (External Platform)
                        </div>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '700', 
                          color: '#1e3a8a',
                          letterSpacing: '0.05em'
                        }}>
                          {invoiceNumber}
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Additional Information Card */}
              {(vehicle.issues_reported || vehicle.notes) && (
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
                      <MessageSquare style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Additional Information
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {vehicle.issues_reported && (
                      <div style={{ 
                        backgroundColor: '#fef2f2', 
                        padding: '1.25rem', 
                        borderRadius: '0.75rem', 
                        borderLeft: '4px solid #dc2626',
                        border: '1px solid #fecaca'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Issues Reported
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#991b1b', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {vehicle.issues_reported}
                        </p>
                      </div>
                    )}
                    {vehicle.notes && (() => {
                      const formattedNotes = formatNotes(vehicle.notes)
                      // Only show if notes contain actual content (not just JSON structure)
                      if (formattedNotes && formattedNotes.trim() && !formattedNotes.startsWith('{')) {
                        return (
                          <div style={{ 
                            backgroundColor: '#f0f9ff', 
                            padding: '1.25rem', 
                            borderRadius: '0.75rem', 
                            borderLeft: '4px solid #2563eb',
                            border: '1px solid #bfdbfe'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#2563eb', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Notes
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#1e40af', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                              {formattedNotes}
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.875rem', 
                padding: '2rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
              }}>
                <VehicleCommentsSection vehicleId={vehicle.id} userRole="admin" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9375rem',
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


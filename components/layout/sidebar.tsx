'use client'

import { useState, useEffect } from 'react'
import { UserRole, getNavigationItems } from '@/lib/helpers/rbac'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Car, Truck, Activity, DollarSign, Settings, Users, FileText, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { getCurrentTenantId } from '@/lib/helpers/tenant-context'

interface SidebarProps {
  userRole: UserRole
}

// Custom Dollar Sign component for Billing & Accounts
const DollarSignIcon = ({ style }: { style?: any }) => (
  <span style={{ fontSize: '1.25rem', fontWeight: '700', ...style }}>$</span>
)

// Icon mapping for navigation items
const iconMap: Record<string, any> = {
  Dashboard: LayoutDashboard,
  'Vehicle Inward': Car,
  'Vehicle Management': Truck,
  Vehicles: Truck, // Keep for backward compatibility
  Trackers: Activity,
  Requirements: FileText,
  Accounts: DollarSign,
  'Billing & Accounts': DollarSignIcon,
  Settings: Settings,
  About: Info,
  'User Management': Users,
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState('R S Cars')
  const [companyLocation, setCompanyLocation] = useState('')
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false)
  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    loadCompanySettings()
    checkSubscriptionStatus()
    const onResize = () => setIsMobile(window.innerWidth <= 640)
    onResize()
    window.addEventListener('resize', onResize)
    
    const tenantId = getCurrentTenantId()
    
    // Set up real-time subscription for company settings
    const channel = supabase
      .channel('company-settings-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'setting_group=eq.company' },
        () => {
          loadCompanySettings()
        }
      )
    
    // Subscribe to tenants table changes for the current tenant
    if (tenantId) {
      channel.on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` },
        () => {
          loadCompanySettings()
        }
      )
    }
    
    channel.subscribe()

    // Listen for custom events when settings are updated
    const handleCompanyUpdate = () => {
      loadCompanySettings()
    }
    window.addEventListener('company-settings-updated', handleCompanyUpdate)
    window.addEventListener('storage', handleCompanyUpdate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('company-settings-updated', handleCompanyUpdate)
      window.removeEventListener('storage', handleCompanyUpdate)
    }
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const tenantId = getCurrentTenantId()
      if (!tenantId) {
        // If no tenant ID, check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: superAdmin } = await supabase
            .from('super_admins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          
          // Super admin should always have access
          if (superAdmin) {
            setIsSubscriptionExpired(false)
            return
          }
        }
        setIsSubscriptionExpired(false) // Don't block if no tenant ID
        return
      }

      // Check if user is super admin or tenant admin - admins always have access
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check super admin
        const { data: superAdmin } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (superAdmin) {
          console.log('✅ Super admin detected - bypassing subscription check')
          setIsSubscriptionExpired(false)
          return
        }

        // Check if user is tenant admin
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('user_id', user.id)
          .maybeSingle()
        
        console.log('👤 Tenant user check:', { tenantUser, tenantId, userId: user.id })
        
        // IMPORTANT: Tenant admins should NOT bypass subscription check
        // They should also be blocked when tenant is inactive
        // They can only access Settings page to submit payment proof
        // Removed the admin bypass - admins are also subject to tenant deactivation
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          is_active,
          subscriptions(billing_period_end)
        `)
        .eq('id', tenantId)
        .single()

      // If there's an error or no tenant data, default to allowing access (don't block)
      if (tenantError || !tenantData) {
        console.warn('⚠️ Could not fetch tenant data, allowing access by default:', tenantError)
        setIsSubscriptionExpired(false)
        return
      }

      // If tenant is not active, block access for ALL users (including admins)
      // Admins can only access Settings page to submit payment proof
      if (!tenantData.is_active) {
        console.log('⚠️ Tenant is inactive - blocking access for all users')
        setIsSubscriptionExpired(true)
        return
      }

      // Tenant is active - check subscription if it exists
      if (tenantData.subscriptions && tenantData.subscriptions.length > 0 && tenantData.subscriptions[0]?.billing_period_end) {
        const endDate = new Date(tenantData.subscriptions[0].billing_period_end)
        const now = new Date()
        const expired = endDate < now
        console.log('📅 Subscription check:', { 
          endDate: endDate.toISOString(), 
          now: now.toISOString(), 
          expired,
          tenantActive: tenantData.is_active 
        })
        setIsSubscriptionExpired(expired)
      } else {
        // No subscription but tenant is active - treat as active (legacy tenant or manually activated)
        console.log('✅ No subscription but tenant is active - allowing access')
        setIsSubscriptionExpired(false)
      }
    } catch (error) {
      console.error('Error checking subscription status:', error)
      // On error, default to allowing access (don't block users)
      setIsSubscriptionExpired(false)
    }
  }

  const loadCompanySettings = async () => {
    try {
      let tenantId = getCurrentTenantId()
      
      // If no tenant ID, try to fetch it from database
      if (!tenantId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser) {
            tenantId = tenantUser.tenant_id
            // Store in session for future use
            sessionStorage.setItem('current_tenant_id', tenantUser.tenant_id)
          }
        }
      }
      
      // If no tenant ID, try to load from system_settings (fallback for default tenant)
      if (!tenantId) {
        const { data, error: settingsError } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['company_name', 'company_address'])
          .is('tenant_id', null) // Platform-wide settings
        
        if (settingsError) {
          console.error('Error loading system settings:', settingsError)
        }
        
        if (data) {
          const nameSetting = data.find(s => s.setting_key === 'company_name')
          const addressSetting = data.find(s => s.setting_key === 'company_address')
          
          if (nameSetting?.setting_value) {
            setCompanyName(nameSetting.setting_value)
            localStorage.setItem('companyName', nameSetting.setting_value)
          }
          
          if (addressSetting?.setting_value) {
            const address = addressSetting.setting_value
            const parts = address.split(',')
            if (parts.length >= 2) {
              const city = parts[parts.length - 2].trim()
              if (city) {
                setCompanyLocation(city)
              }
            }
          }
        }
        return
      }
      
      // Load tenant-specific company name from tenants table
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, workspace_url')
        .eq('id', tenantId)
        .single()
      
      if (error) {
        console.error('Error loading tenant:', error)
        // Fallback to default name if tenant load fails
        const storedName = localStorage.getItem('companyName')
        if (storedName) {
          setCompanyName(storedName)
        } else {
          // Set a default name if nothing is stored
          setCompanyName('Company')
        }
        return
      }
      
      if (tenant) {
        // Set company name from tenant name - remove city suffix if present
        // If tenant name has "•" separator, use only the part before it
        const nameParts = tenant.name.split('•')
        const companyNameOnly = nameParts[0].trim()
        setCompanyName(companyNameOnly)
        localStorage.setItem('companyName', companyNameOnly)
        
        // Extract city from tenant name if present (e.g., "RS Car Accessories • Nagpur")
        if (nameParts.length > 1) {
          setCompanyLocation(nameParts[nameParts.length - 1].trim())
        } else {
          // Fallback: try to get from system_settings for this tenant
          const { data: settings } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['company_address'])
            .eq('setting_group', 'company')
            .eq('tenant_id', tenantId)
          
          if (settings && settings.length > 0) {
            const address = settings[0].setting_value
            const parts = address.split(',')
            if (parts.length >= 2) {
              const city = parts[parts.length - 2].trim()
              if (city) {
                setCompanyLocation(city)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  // Get role-based navigation items
  const navigationItems = getNavigationItems(userRole)
  
  // Debug: Log navigation items
  useEffect(() => {
    console.log('📋 Navigation Items Debug:', {
      userRole,
      navigationItemsCount: navigationItems.length,
      navigationItems: navigationItems.map(i => ({ title: i.title, href: i.href })),
      isSubscriptionExpired,
      shouldBlock: isSubscriptionExpired && userRole !== 'admin',
      filteredItems: (isSubscriptionExpired && userRole !== 'admin'
        ? navigationItems.filter(item => item.href === '/settings' || item.href === '/about')
        : navigationItems).map(i => ({ title: i.title, href: i.href }))
    })
  }, [userRole, navigationItems, isSubscriptionExpired])

  return (
    <div style={{ 
      width: isMobile ? '72px' : '260px', 
      backgroundColor: '#0f172a', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
    }}>
      {/* Logo */}
      <div style={{ 
        padding: isMobile ? '1rem' : '1.75rem 1.5rem', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Logo Icon */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isMobile ? 'center' : 'flex-start',
          marginBottom: isMobile ? '0' : '0.5rem'
        }}>
          <Logo size={isMobile ? "medium" : "large"} showText={false} variant="light" />
        </div>
        
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            {/* Company Name - Bold and Prominent */}
            <div style={{ 
              fontSize: '0.9375rem', 
              fontWeight: '700',
              color: 'rgba(255,255,255,0.95)',
              lineHeight: '1.5',
              letterSpacing: '0.01em',
              textTransform: 'none'
            }}>
              {companyName}
            </div>
            
            {/* Co-Powered by Zoravo - Subtle but Clear */}
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginTop: '0.25rem'
            }}>
              <span style={{ 
                fontWeight: 400,
                textTransform: 'uppercase',
                fontSize: '0.6875rem',
                letterSpacing: '0.05em'
              }}>
                Co-Powered by
              </span>
              <span style={{ 
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.8125rem',
                letterSpacing: '0.02em'
              }}>
                Zoravo
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: isMobile ? '0.25rem' : '0.5rem', overflow: 'auto' }}>
        {(() => {
          // Filter navigation items based on subscription status
          // Only block if subscription is truly expired AND user is not admin
          const shouldBlock = isSubscriptionExpired && userRole !== 'admin'
          
          const filteredItems = shouldBlock
            ? navigationItems.filter(item => item.href === '/settings' || item.href === '/about')
            : navigationItems
          
          // Debug logging
          if (navigationItems.length === 0 || filteredItems.length === 0) {
            console.warn('⚠️ Navigation items issue:', {
              userRole,
              navigationItemsCount: navigationItems.length,
              navigationItems: navigationItems.map(i => i.title),
              isSubscriptionExpired,
              shouldBlock,
              filteredItemsCount: filteredItems.length,
              filteredItems: filteredItems.map(i => i.title)
            })
          }
          
          return filteredItems.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = iconMap[item.title] || LayoutDashboard
          
          return (
            <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0' : '0.75rem',
                padding: isMobile ? '0.75rem 0.5rem' : '0.875rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s',
                backgroundColor: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem' }}>
                  {Icon === DollarSignIcon ? (
                    <Icon style={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)' }} />
                  ) : (
                    <Icon style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </div>
                {!isMobile && <span>{item.title}</span>}
              </div>
            </Link>
          )
        })
        })()}
      </nav>

      {/* User Info */}
      <div style={{ 
        padding: isMobile ? '0.75rem' : '1rem 1.5rem', 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)'
      }}>
        <div style={{ 
          padding: isMobile ? '0.5rem' : '0.75rem', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          borderRadius: '0.5rem',
          border: '1px solid rgba(96, 165, 250, 0.2)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            Logged in as
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', textTransform: 'capitalize', textAlign: isMobile ? 'center' : 'left' }}>
            {userRole}
          </div>
        </div>
      </div>
    </div>
  )
}

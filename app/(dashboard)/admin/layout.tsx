'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/helpers/auth-error-handler'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Shield
} from 'lucide-react'
import Logo from '@/components/Logo'

interface AdminLayoutProps {
  children: React.ReactNode
}

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    title: 'Tenants',
    href: '/admin/tenants',
    icon: Building2
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users
  },
  {
    title: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCard
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3
  },
  {
    title: 'Platform Settings',
    href: '/admin/settings',
    icon: Settings
  }
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { user, error: userError } = await safeGetUser(
        supabase,
        () => {
          router.push('/login')
        }
      )
      
      if (userError || !user) {
        if (!userError) {
          router.push('/login')
        }
        return
      }

      const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: rsCarAdmin } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
        .eq('role', 'admin')
        .maybeSingle()

      if (!superAdmin && !rsCarAdmin) {
        router.push('/dashboard')
        return
      }

      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Admin')
      setUserEmail(user.email || '')
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Admin Sidebar */}
      <aside style={{
        width: '16rem',
        backgroundColor: '#1e293b',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #334155'
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.75rem 1.5rem',
          borderBottom: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.875rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            width: '100%',
            marginBottom: '0.25rem'
          }}>
            <Logo size="medium" showText={false} variant="light" />
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#cbd5e1',
            letterSpacing: '0.03em',
            textAlign: 'left',
            lineHeight: '1.5',
            width: '100%',
            marginTop: '0.125rem'
          }}>
            <span style={{ fontWeight: 500 }}>Co-Powered by </span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>Zoravo</span>
          </div>
          <div style={{ 
            fontSize: '0.9375rem', 
            color: '#94a3b8',
            fontWeight: '600',
            textAlign: 'left',
            width: '100%',
            letterSpacing: '0.02em'
          }}>
            Platform Management
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem', overflow: 'auto' }}>
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || 
                            (item.href !== '/admin' && pathname.startsWith(item.href))
            const Icon = item.icon
            
            return (
              <a
                key={item.title}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(item.href)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  borderRadius: '0.5rem',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textDecoration: 'none'
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
                <Icon style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.title}</span>
              </a>
            )
          })}
        </nav>

        {/* User Info */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #334155',
          backgroundColor: '#0f172a'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userName}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userEmail}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = '#ef4444'
              e.currentTarget.style.color = '#fca5a5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#334155'
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              ZORAVO Platform Administration
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  )
}


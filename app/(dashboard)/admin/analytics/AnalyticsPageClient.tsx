'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Activity
} from 'lucide-react'

export default function AnalyticsPageClient() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    growthRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Check if user is authenticated and is super admin
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User not authenticated:', userError)
        setStats({
          totalTenants: 0,
          activeTenants: 0,
          totalUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          growthRate: 0
        })
        return
      }

      // Verify user is super admin
      const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      
      const { data: superAdmin, error: superAdminError } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: rsCarAdmin, error: rsCarAdminError } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
        .eq('role', 'admin')
        .maybeSingle()

      if (superAdminError) {
        console.warn('Error checking super admin status:', superAdminError)
      }
      if (rsCarAdminError) {
        console.warn('Error checking RS Car admin status:', rsCarAdminError)
      }

      if (!superAdmin && !rsCarAdmin) {
        console.error('User is not a super admin or RS Car admin')
        console.error('User ID:', user.id)
        console.error('Super Admin Check Result:', superAdmin)
        console.error('RS Car Admin Check Result:', rsCarAdmin)
        setStats({
          totalTenants: 0,
          activeTenants: 0,
          totalUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          growthRate: 0
        })
        return
      }

      console.log('Super admin verified, loading analytics data...')
      
      // Get tenant stats
      let tenants: any[] = []
      try {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, is_active, subscription_status, is_free, trial_ends_at')

        if (tenantsError) {
          console.error('Error loading tenants:', tenantsError)
          console.error('Error code:', tenantsError?.code)
          console.error('Error message:', tenantsError?.message)
          console.error('Error details:', tenantsError?.details)
          console.error('Error hint:', tenantsError?.hint)
          console.error('Full error:', JSON.stringify(tenantsError, null, 2))
          // Continue with empty array instead of returning
          tenants = []
        } else {
          tenants = tenantsData || []
        }
      } catch (err: any) {
        console.error('Exception loading tenants:', err)
        console.error('Exception details:', JSON.stringify(err, null, 2))
        tenants = []
      }

      // Get user count
      let tenantUsers: any[] = []
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('tenant_users')
          .select('user_id')

        if (usersError) {
          console.warn('Error loading users (non-critical):', usersError)
          tenantUsers = []
        } else {
          tenantUsers = usersData || []
        }
      } catch (err) {
        console.warn('Exception loading users (non-critical):', err)
        tenantUsers = []
      }

      // Get revenue stats (use 'active' status instead of 'paid')
      let subscriptions: any[] = []
      try {
        const { data: subsData, error: subsError } = await supabase
          .from('subscriptions')
          .select('amount, status, created_at')
          .eq('status', 'active')

        if (subsError) {
          console.warn('Error loading subscriptions (non-critical):', subsError)
          subscriptions = []
        } else {
          subscriptions = subsData || []
        }
      } catch (err) {
        console.warn('Exception loading subscriptions (non-critical):', err)
        subscriptions = []
      }

      const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0)
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const monthlyRevenue = subscriptions.filter(s => 
        s.created_at && new Date(s.created_at) >= thisMonth
      ).reduce((sum, s) => sum + (s.amount || 0), 0)

      const uniqueUsers = new Set(tenantUsers.map(tu => tu.user_id))

      setStats({
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.is_active).length,
        totalUsers: uniqueUsers.size,
        totalRevenue,
        monthlyRevenue,
        growthRate: 0 // Calculate based on previous month
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          Platform Analytics
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Overview of platform performance and metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          icon={Building2}
          label="Total Tenants"
          value={stats.totalTenants}
          color="#2563eb"
        />
        <StatCard
          icon={Activity}
          label="Active Tenants"
          value={stats.activeTenants}
          color="#059669"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          color="#7c3aed"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="#dc2626"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toFixed(2)}`}
          color="#f59e0b"
        />
      </div>

      {/* Charts Placeholder */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <BarChart3 style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#9ca3af' }} />
        <p>Revenue charts and detailed analytics coming soon</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.5rem',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon style={{ width: '1.25rem', height: '1.25rem', color }} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        {label}
      </div>
    </div>
  )
}


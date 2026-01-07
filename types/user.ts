/**
 * User-related type definitions
 */

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'installer' | 'accountant'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  department?: string
  departments?: string[]
  specialization?: string
  status: 'active' | 'inactive'
  join_date?: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatar_url?: string
}

export interface TenantUser {
  user_id: string
  tenant_id: string
  role: UserRole
  is_primary_admin?: boolean
  created_at?: string
}


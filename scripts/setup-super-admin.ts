/**
 * Setup Super Admin Script
 * 
 * This script helps you set up a super admin user.
 * Run with: npx tsx scripts/setup-super-admin.ts <email>
 * 
 * Example: npx tsx scripts/setup-super-admin.ts Adajan@filmshoppee.com
 */

import { createAdminClient } from '../lib/supabase/admin'

async function setupSuperAdmin(email: string) {
  try {
    console.log(`Setting up super admin for: ${email}`)
    
    const adminSupabase = createAdminClient()
    
    // Get user by email
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error(`User with email ${email} not found.`)
      console.log('Available users:')
      users.users.forEach(u => console.log(`  - ${u.email} (${u.id})`))
      process.exit(1)
    }
    
    console.log(`Found user: ${user.email} (${user.id})`)
    
    // Check if already super admin
    const { data: existing } = await adminSupabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (existing) {
      console.log('User is already a super admin!')
      console.log(existing)
      process.exit(0)
    }
    
    // Create super admin record
    const { data, error } = await adminSupabase
      .from('super_admins')
      .insert({
        user_id: user.id,
        email: email,
        can_access_all_tenants: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating super admin:', error)
      process.exit(1)
    }
    
    console.log('✅ Super admin created successfully!')
    console.log(data)
    
  } catch (error: any) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/setup-super-admin.ts <email>')
  console.error('Example: npx tsx scripts/setup-super-admin.ts raghav@sunkool.in')
  process.exit(1)
}

setupSuperAdmin(email)


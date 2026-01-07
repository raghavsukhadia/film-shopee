/**
 * Change Super Admin Script
 * 
 * This script changes the super admin from the old user to a new user.
 * Run with: npx tsx scripts/change-super-admin.ts <new-email> [old-email]
 * 
 * Example: npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com
 * Example: npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com raghav@sunkool.in
 */

import { createAdminClient } from '../lib/supabase/admin'

async function changeSuperAdmin(newEmail: string, oldEmail?: string) {
  try {
    console.log(`Changing super admin to: ${newEmail}`)
    
    const adminSupabase = createAdminClient()
    
    // Get all users
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }
    
    // Find new user
    const newUser = users.users.find(u => u.email?.toLowerCase() === newEmail.toLowerCase())
    
    if (!newUser) {
      console.error(`❌ User with email ${newEmail} not found.`)
      console.log('\nAvailable users:')
      users.users.forEach(u => console.log(`  - ${u.email} (${u.id})`))
      console.log('\nPlease create the user first in Supabase Dashboard > Authentication > Users')
      process.exit(1)
    }
    
    console.log(`✅ Found new user: ${newUser.email} (${newUser.id})`)
    
    // Find old user if email provided
    let oldUserId: string | null = null
    if (oldEmail) {
      const oldUser = users.users.find(u => u.email?.toLowerCase() === oldEmail.toLowerCase())
      if (oldUser) {
        oldUserId = oldUser.id
        console.log(`Found old user: ${oldUser.email} (${oldUser.id})`)
      } else {
        console.log(`⚠️  Old user ${oldEmail} not found, will only add new super admin`)
      }
    }
    
    // Remove old super admin if found
    if (oldUserId) {
      const { error: deleteError } = await adminSupabase
        .from('super_admins')
        .delete()
        .eq('user_id', oldUserId)
      
      if (deleteError) {
        console.error('Error removing old super admin:', deleteError)
        process.exit(1)
      }
      console.log('✅ Removed old super admin')
    }
    
    // Check if new user is already super admin
    const { data: existing } = await adminSupabase
      .from('super_admins')
      .select('*')
      .eq('user_id', newUser.id)
      .single()
    
    if (existing) {
      console.log('⚠️  User is already a super admin!')
      console.log(existing)
    } else {
      // Create super admin record
      const { data, error } = await adminSupabase
        .from('super_admins')
        .insert({
          user_id: newUser.id
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating super admin:', error)
        process.exit(1)
      }
      
      console.log('✅ Created super admin record')
      console.log(data)
    }
    
    // Update or create profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        email: newEmail,
        name: 'Super Admin',
        role: 'admin'
      })
    
    if (profileError) {
      console.error('Error updating profile:', profileError)
      process.exit(1)
    }
    
    console.log('✅ Updated profile')
    
    // Verify
    const { data: verify } = await adminSupabase
      .from('super_admins')
      .select('*, profiles(email, name, role)')
      .eq('user_id', newUser.id)
      .single()
    
    console.log('\n✅ Super admin changed successfully!')
    console.log('Verification:')
    console.log(verify)
    
  } catch (error: any) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

// Get email from command line arguments
const newEmail = process.argv[2]
const oldEmail = process.argv[3]

if (!newEmail) {
  console.error('Usage: npx tsx scripts/change-super-admin.ts <new-email> [old-email]')
  console.error('Example: npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com')
  console.error('Example: npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com raghav@sunkool.in')
  process.exit(1)
}

changeSuperAdmin(newEmail, oldEmail)


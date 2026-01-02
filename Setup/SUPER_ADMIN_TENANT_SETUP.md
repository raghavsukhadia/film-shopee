# Super Admin & First Tenant (Z01) Setup Guide

## Overview

In this application, the **Super Admin** and the **First Tenant Admin (Z01)** use the **same login credentials**. This is by design for development and initial setup.

## Architecture

- **Super Admin**: User in the `super_admins` table
- **First Tenant (Z01)**: The first tenant created with ID `00000000-0000-0000-0000-000000000001`
- **Z01 Admin**: User who is admin in tenant Z01 (same user as super admin)

## How It Works

1. **Super Admin Login**: 
   - User logs in with super admin credentials
   - System checks if user is in `super_admins` table
   - If yes, user has super admin privileges

2. **Z01 Tenant Admin**:
   - Same user is also admin in tenant Z01
   - When logged in as Z01 tenant, user has admin role
   - This allows the super admin to manage the first tenant

3. **Role Detection**:
   - The application checks both:
     - If user is in `super_admins` table → Super Admin
     - If user is admin in tenant Z01 → Z01 Admin
   - Both conditions grant 'admin' role in the settings page

## Settings Page Access

The super admin (who is also Z01 admin) should see **ALL tabs**:
- ✅ Profile
- ✅ Company
- ✅ Management (with all sub-sections)
- ✅ Notifications
- ✅ Payment

## Management Tab Sections

The Management tab includes these sub-sections (all visible to admin):
- Installers
- Accountants
- Coordinators
- Managers
- Locations
- Vehicle Types
- Departments

## Verification

To verify the setup is correct:

1. **Check Super Admin**:
   ```sql
   SELECT * FROM super_admins WHERE user_id = 'your-user-id';
   ```

2. **Check Z01 Admin**:
   ```sql
   SELECT * FROM tenant_users 
   WHERE tenant_id = '00000000-0000-0000-0000-000000000001' 
   AND user_id = 'your-user-id' 
   AND role = 'admin';
   ```

3. **Check Settings Page**:
   - Login as super admin
   - Navigate to Settings
   - Verify all 5 tabs are visible
   - Verify all Management sub-sections are accessible

## Troubleshooting

### Issue: Not seeing all tabs in Settings

**Solution**: The `loadCurrentUser` function in `SettingsPageClient.tsx` now:
- Checks for super admin status
- Checks for Z01 admin status
- Sets role to 'admin' if either condition is true

### Issue: Missing sections in Management tab

**Solution**: All Management sub-sections are visible to admin role. If sections are missing:
1. Verify user role is set to 'admin' (check browser console)
2. Verify user is either super admin or Z01 admin
3. Refresh the page

## Code Changes

The following changes ensure super admin/Z01 admin sees all sections:

1. **`loadCurrentUser` function**:
   - Checks `super_admins` table
   - Checks `tenant_users` for Z01 admin
   - Sets `userRole` to 'admin' if either is true

2. **`filteredTabs` logic**:
   - Admin role sees all tabs
   - Non-admin roles only see Company tab

3. **Tab content visibility**:
   - All tab content checks for `userRole === 'admin'`
   - Super admin and Z01 admin both have 'admin' role

## Notes

- The first tenant (Z01) is special - it's the super admin's tenant
- Super admin can access both:
  - Platform admin features (via `/admin` routes)
  - Tenant admin features (via regular tenant routes)
- This dual-role setup is intentional for development and initial tenant management


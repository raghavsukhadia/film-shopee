# Change Super Admin Guide

This guide explains how to change the super admin user to **Adajan@filmshoppee.com**.

## Prerequisites

1. The user **Adajan@filmshoppee.com** must exist in Supabase Auth
   - If not, create the user first in Supabase Dashboard > Authentication > Users

2. You need access to:
   - Supabase Dashboard (SQL Editor)
   - Or ability to run Node.js scripts with environment variables configured

## Method 1: Using the Automated Script (Recommended)

This is the easiest and safest method:

```bash
npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com raghav@sunkool.in
```

**What this does:**
- Finds the user "Adajan@filmshoppee.com" in Supabase Auth
- Removes the old super admin (raghav@sunkool.in)
- Adds the new super admin (Adajan@filmshoppee.com)
- Updates the profile with correct email and role

**If you don't know the old email:**
```bash
npx tsx scripts/change-super-admin.ts Adajan@filmshoppee.com
```
This will only add the new super admin without removing the old one.

## Method 2: Using SQL Script (Manual)

If you prefer to use SQL directly:

1. **Get the User ID for Adajan@filmshoppee.com:**
   - Go to Supabase Dashboard > Authentication > Users
   - Find "Adajan@filmshoppee.com"
   - Copy the "User UID" value

2. **Open the migration file:**
   - Open `database/32_change_super_admin_to_adajan.sql`

3. **Replace the placeholder:**
   - Find `'NEW_USER_ID_HERE'` in the file
   - Replace it with the actual User ID you copied

4. **Run the SQL script:**
   - Go to Supabase Dashboard > SQL Editor
   - Paste the modified SQL script
   - Click "Run"

## Method 3: Using the Setup Script

If the new user doesn't exist as super admin yet:

```bash
npx tsx scripts/setup-super-admin.ts Adajan@filmshoppee.com
```

**Note:** This only adds the new super admin. You may need to manually remove the old one.

## Verification

After changing the super admin, verify the changes:

### Using SQL:
```sql
-- Check new super admin
SELECT sa.*, p.email, p.name 
FROM super_admins sa
JOIN profiles p ON sa.user_id = p.id
WHERE p.email = 'Adajan@filmshoppee.com';

-- Verify old super admin is removed (should return no rows)
SELECT * FROM super_admins 
WHERE user_id = '5efd1861-9238-4022-a2c0-a1fbc99b0fbb';
```

### Using the Application:
1. Log out of the current session
2. Log in with **Adajan@filmshoppee.com**
3. You should have super admin access

## Important Notes

⚠️ **Backup your database** before making changes in production.

⚠️ **The old super admin will lose access** after this change. Make sure the new user has been created and can log in.

⚠️ **If the new user doesn't exist**, create them first in Supabase Dashboard > Authentication > Users.

## Troubleshooting

### Error: "User not found"
- Make sure the user "Adajan@filmshoppee.com" exists in Supabase Auth
- Check the email spelling (case-insensitive)

### Error: "Permission denied"
- Make sure you're using the Supabase admin client or have proper database permissions
- Check your environment variables (SUPABASE_SERVICE_ROLE_KEY)

### Old super admin still has access
- Clear browser cache and session storage
- Log out and log back in
- Verify the SQL script removed the old entry

## Files Modified

The following files have been updated to reflect the new super admin email:

- `database/05_create_super_admin.sql` - Updated example email
- `database/32_change_super_admin_to_adajan.sql` - New migration script
- `scripts/setup-super-admin.ts` - Updated example email
- `scripts/change-super-admin.ts` - New script for changing super admin


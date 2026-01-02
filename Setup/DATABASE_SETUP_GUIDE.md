# Database Setup Guide for Filmshoppee-Car (Zoravo OMS)

This guide will help you set up the complete database for your Filmshoppee-Car application on Supabase.

## Prerequisites

1. A Supabase account and project
2. Access to Supabase SQL Editor
3. Your Supabase project URL and API keys

## Step-by-Step Setup

### Step 1: Access Supabase SQL Editor

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Execute SQL Files in Order

Execute the following SQL files **in order** using the Supabase SQL Editor:

#### 2.1. Create Database Schema
1. Open `database/01_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)
5. Wait for "Success. No rows returned" message

#### 2.2. Set Up Row Level Security (RLS)
1. Open `database/02_rls_policies.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. Verify all policies are created successfully

#### 2.3. Insert Initial Data
1. Open `database/03_initial_data.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. This will create default subscription plans and system settings

#### 2.4. Create Functions and Views
1. Open `database/04_functions_and_views.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. This creates helper functions and reporting views

### Step 3: Create Super Admin User

#### 3.1. Create Auth User
1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add User** > **Create New User**
3. Enter:
   - **Email**: `admin@yourdomain.com` (use your admin email)
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ Check this box
4. Click **Create User**
5. **Copy the User ID** (you'll need this in the next step)

#### 3.2. Create Super Admin Record
1. Go back to **SQL Editor**
2. Run the following SQL (replace `USER_ID_HERE` with the actual User ID from step 3.1):

```sql
-- Insert super admin record
INSERT INTO super_admins (user_id)
VALUES ('USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;

-- Create profile for super admin
INSERT INTO profiles (id, email, name, role)
VALUES (
    'USER_ID_HERE',
    'admin@yourdomain.com',  -- Replace with actual email
    'Super Admin',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

3. Click **Run**

### Step 4: Configure Environment Variables

1. Go to your project root directory
2. Copy `.env.example` to `.env.local` (if it doesn't exist)
3. Update the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Domain
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com

# Resend Email Configuration (if using email)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Where to find these values:**
- **NEXT_PUBLIC_SUPABASE_URL**: Supabase Dashboard > Settings > API > Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase Dashboard > Settings > API > Project API keys > `anon` `public`
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard > Settings > API > Project API keys > `service_role` `secret` ⚠️ Keep this secret!

### Step 5: Set Up Storage Buckets (Required for Payment Proofs)

**⚠️ IMPORTANT**: The payment proof feature requires a storage bucket. Without it, you'll see "Storage bucket not configured" errors.

#### Option 1: Quick Setup via SQL (Recommended)

1. Open `database/07_setup_storage_bucket.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. This creates the `payment-proofs` bucket with proper configuration

#### Option 2: Manual Setup via Dashboard

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Configure:
   - **Bucket name**: `payment-proofs` (must be exact)
   - **Public bucket**: ✅ Yes (recommended for easier access)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`
4. Click **Create bucket**

#### Option 3: Detailed Guide

For detailed instructions, troubleshooting, and advanced configuration options, see:
- **`Setup/STORAGE_BUCKET_SETUP.md`** - Complete guide with all options

**Note**: If you set the bucket to **Private**, you'll need to configure RLS policies. See the detailed guide for policy examples.

### Step 6: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if super admin exists
SELECT sa.id, p.email, p.name 
FROM super_admins sa
JOIN profiles p ON sa.user_id = p.id;

-- Check system settings
SELECT setting_key, setting_value 
FROM system_settings 
WHERE tenant_id IS NULL;
```

### Step 7: Create Your First Tenant (Optional)

You can create your first tenant through the application UI or directly in SQL:

```sql
-- Create a tenant
INSERT INTO tenants (name, tenant_code, workspace_url, email, phone, city, state, is_active)
VALUES (
    'Your Company Name',
    'COMPANY01',
    'company01',
    'contact@company.com',
    '+91-9876543210',
    'Mumbai',
    'Maharashtra',
    true
)
RETURNING id;

-- Note the tenant_id from the result, then create a user and link them:
-- 1. Create auth user (through Supabase Dashboard > Authentication)
-- 2. Create profile
-- 3. Link to tenant:
INSERT INTO tenant_users (tenant_id, user_id, role)
VALUES ('TENANT_ID_HERE', 'USER_ID_HERE', 'admin');
```

## Troubleshooting

### Issue: "Permission denied" errors
**Solution**: Make sure you've executed `02_rls_policies.sql` and that your user has the correct permissions.

### Issue: "Table does not exist" errors
**Solution**: Make sure you've executed `01_schema.sql` first, in order.

### Issue: "Function does not exist" errors
**Solution**: Make sure you've executed `04_functions_and_views.sql`.

### Issue: Cannot create super admin
**Solution**: 
1. Verify the user exists in `auth.users` table
2. Check that the User ID is correct (UUID format)
3. Make sure you're using the service role key for admin operations

### Issue: RLS blocking queries
**Solution**: 
1. Verify RLS policies are created correctly
2. Check that users are linked to tenants via `tenant_users` table
3. For super admins, verify they exist in `super_admins` table

## Next Steps

1. **Test the Application**: Start your Next.js application and try logging in with the super admin account
2. **Create First Tenant**: Use the admin panel to create your first tenant
3. **Configure Settings**: Update system settings through the admin panel
4. **Set Up Email**: Configure Resend API for email functionality
5. **Set Up WhatsApp**: Configure WhatsApp integration if needed

## Support

If you encounter any issues:
1. Check the Supabase logs in Dashboard > Logs
2. Verify all SQL files executed successfully
3. Check that environment variables are set correctly
4. Review the application console for error messages

## File Structure

```
database/
├── 01_schema.sql              # All table definitions
├── 02_rls_policies.sql        # Row Level Security policies
├── 03_initial_data.sql        # Initial seed data
├── 04_functions_and_views.sql # Helper functions and views
├── 05_create_super_admin.sql  # Template for creating super admin
├── 06_setup_rs_car_tenant.sql # Example tenant setup
└── 07_setup_storage_bucket.sql # Storage bucket setup

Setup/
├── DATABASE_SETUP_GUIDE.md    # This file
├── STORAGE_BUCKET_SETUP.md    # Detailed storage bucket guide
└── ERROR_FIXES.md             # Common error fixes
```

---

**Note**: Keep your `SUPABASE_SERVICE_ROLE_KEY` secret and never commit it to version control!


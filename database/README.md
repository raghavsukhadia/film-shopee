# Database Files

This folder contains all SQL files needed to set up the Filmshoppee-Car (Zoravo OMS) database.

## File Execution Order

Execute these files **in order** using Supabase SQL Editor:

1. **01_schema.sql** - Creates all database tables, indexes, and triggers
2. **02_rls_policies.sql** - Sets up Row Level Security (RLS) policies
3. **03_initial_data.sql** - Inserts initial system settings and subscription plans
4. **04_functions_and_views.sql** - Creates helper functions and reporting views

### Migration Files (for existing databases)

If you have an existing database, run these migration files as needed:

- **14_add_odometer_priority_to_vehicle_inward.sql** - Adds `odometer_reading` and `priority` columns to `vehicle_inward` table
- **15_create_vehicle_inward_comments_table.sql** - Creates `vehicle_inward_comments` table and updates attachment table structure
- **16_update_tenant_codes_to_fs_format.sql** - Updates tenant code generation to FS01, FS02, FS03 format and provides migration for existing Z codes

## Quick Setup

### Option 1: Execute Files Individually (Recommended)

1. Open Supabase Dashboard > SQL Editor
2. Execute each file in order (01 → 02 → 03 → 04)
3. Verify each execution shows "Success"

### Option 2: Execute All at Once

You can also use `00_complete_setup.sql` which combines all files in the correct order.

## What Each File Does

### 01_schema.sql
- Creates all 30+ database tables
- Sets up foreign key relationships
- Creates indexes for performance
- Sets up triggers for `updated_at` timestamps

**Tables Created:**
- Multi-tenant: `tenants`, `tenant_users`, `super_admins`
- User management: `profiles`
- Vehicle management: `vehicles`, `customers`, `vehicle_inward`
- Work orders: `work_orders`, `service_trackers`
- Financial: `invoices`, `payments`, `expenses`
- Subscriptions: `subscriptions`, `subscription_plan_requests`, `tenant_payment_proofs`
- Settings: `system_settings`
- And more...

### 02_rls_policies.sql
- Enables Row Level Security on all tables
- Creates policies for tenant isolation
- Sets up super admin access
- Ensures data security and multi-tenancy

### 03_initial_data.sql
- Inserts default subscription plans
- Sets up platform-wide system settings
- Includes instructions for creating super admin

### 04_functions_and_views.sql
- Creates helper functions (e.g., `generate_short_id()`)
- Creates reporting views (e.g., `v_revenue_monthly`)
- Sets up auto-generation triggers

## Important Notes

⚠️ **Always execute files in order** - Each file depends on the previous one.

⚠️ **Backup your database** before running these scripts if you have existing data.

⚠️ **Test in a development environment** first before applying to production.

## After Setup

1. Create a super admin user (see `Setup/DATABASE_SETUP_GUIDE.md`)
2. Configure environment variables
3. Test the application

## Troubleshooting

If you encounter errors:

1. **"Table already exists"** - Drop existing tables or use `IF NOT EXISTS` clauses
2. **"Permission denied"** - Make sure you're using the correct database user
3. **"Function does not exist"** - Execute files in order, starting from 01

## Support

For detailed setup instructions, see:
- `Setup/DATABASE_SETUP_GUIDE.md` - Complete setup guide
- `Setup/QUICK_START.md` - Quick 5-minute setup


# Fix Duplicate Policy Errors

## Problem
When running `database/02_rls_policies.sql`, you may encounter errors like:
```
ERROR: 42710: policy "Super admins can view all tenants" for table "tenants" already exists
```

This happens when policies were already created in a previous run.

## Solution

### Option 1: Run the Fix Script (Recommended)

1. Open `database/12_fix_duplicate_policies.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**

This script will:
- Drop all existing policies that might conflict
- Recreate them with the correct definitions
- Safe to run multiple times

### Option 2: Use the Updated Main File

The `database/02_rls_policies.sql` file has been updated to include `DROP POLICY IF EXISTS` statements before each `CREATE POLICY`. However, if you're running it for the first time after policies were already created, you may still see errors.

**To fix:**
1. Run `database/12_fix_duplicate_policies.sql` first (to clean up)
2. Then you can safely run `database/02_rls_policies.sql` again if needed

### Option 3: Manual Fix (If you know which policy is causing issues)

If you know the specific policy name, you can drop it manually:

```sql
DROP POLICY IF EXISTS "Policy Name" ON table_name;
```

Then recreate it with the `CREATE POLICY` statement from `02_rls_policies.sql`.

## What Policies Are Fixed

The fix script handles these commonly problematic policies:
- ✅ Tenants policies (4 policies)
- ✅ Tenant Users policies (2 policies)
- ✅ Super Admins policies (2 policies)
- ✅ Message Templates policies (3 policies)
- ✅ Tenant Payment Proofs policies (3 policies)

## Verification

After running the fix script, verify policies exist:

```sql
-- Check tenants policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'tenants';

-- Check message_templates policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'message_templates';
```

## Notes

- The fix script is **idempotent** - safe to run multiple times
- It only affects the policies listed - other policies remain unchanged
- If you need to fix other policies, add them to the script following the same pattern


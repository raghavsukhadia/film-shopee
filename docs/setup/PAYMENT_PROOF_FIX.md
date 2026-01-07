# Payment Proof Table Fix

## Problem
The `tenant_payment_proofs` table schema didn't match what the application code was trying to insert, causing "Failed to create payment proof record" errors.

## Issues Found
1. **Missing columns**: The table was missing several columns that the code expected:
   - `admin_user_id` (code was using this, but table had `uploaded_by`)
   - `payment_proof_url` (code was using this, but table had `file_path`)
   - `amount`, `currency`, `payment_date`, `transaction_id`, `notes` (all missing)

2. **Missing RLS policies**: The table had RLS enabled but no policies, blocking all inserts.

## Solution

### Step 1: Update Table Schema
Run the migration script to add missing columns:

1. Open `database/08_fix_payment_proofs_table.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**

This script will:
- ✅ Add all missing columns (`admin_user_id`, `payment_proof_url`, `amount`, `currency`, `payment_date`, `transaction_id`, `notes`)
- ✅ Make `file_path` and `file_name` optional (for backward compatibility)
- ✅ Add RLS policies for tenant admins and super admins
- ✅ Migrate existing data if any

### Step 2: Verify the Fix

After running the script, test the payment proof submission:

1. Go to Settings page
2. Fill in the payment proof form
3. Upload a file
4. Submit

You should now see a success message instead of the error!

## What Changed

### Table Schema Updates
- Added `admin_user_id` column (replaces `uploaded_by`)
- Added `payment_proof_url` column (stores the full URL to the file)
- Added `amount`, `currency`, `payment_date`, `transaction_id`, `notes` columns
- Made `file_path` and `file_name` optional (kept for backward compatibility)

### RLS Policies Added
1. **Tenant admins can view their payment proofs** - Allows tenant admins to see payment proofs for their tenant
2. **Tenant admins can insert payment proofs** - Allows tenant admins to create payment proof records
3. **Super admins can manage all payment proofs** - Allows super admins full access for review/approval

## Files Modified

1. `database/01_schema.sql` - Updated table definition
2. `database/02_rls_policies.sql` - Added RLS policies
3. `database/08_fix_payment_proofs_table.sql` - Migration script (NEW)

## Next Steps

After running the migration:
1. ✅ Test payment proof submission
2. ✅ Verify files are uploaded to storage bucket
3. ✅ Check that payment proofs appear in the database
4. ✅ Test super admin review workflow (if applicable)

---

**Note**: If you have existing payment proof records, the migration script will preserve them and update the schema accordingly.


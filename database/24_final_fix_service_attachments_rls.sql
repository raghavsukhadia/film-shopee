-- FINAL FIX: Complete RLS Policy Reset for service_tracker_attachments
-- This script will completely reset all RLS policies to ensure they work correctly

-- =====================================================
-- STEP 1: Drop ALL existing policies (comprehensive cleanup)
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on service_tracker_attachments table
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'service_tracker_attachments'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON service_tracker_attachments', r.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Ensure table structure is correct
-- =====================================================
-- Make sure tenant_id can be NULL (in case it's not set)
ALTER TABLE service_tracker_attachments 
ALTER COLUMN tenant_id DROP NOT NULL;

-- =====================================================
-- STEP 3: Disable RLS temporarily, then re-enable
-- =====================================================
ALTER TABLE service_tracker_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_tracker_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create NEW policies with unique names
-- =====================================================
-- SELECT Policy: Allow all authenticated users to view
CREATE POLICY "policy_service_attachments_select_all"
ON service_tracker_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow all authenticated users to insert (CRITICAL)
CREATE POLICY "policy_service_attachments_insert_all"
ON service_tracker_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow all authenticated users to update
CREATE POLICY "policy_service_attachments_update_all"
ON service_tracker_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow all authenticated users to delete
CREATE POLICY "policy_service_attachments_delete_all"
ON service_tracker_attachments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- STEP 5: Fix Storage Bucket RLS policies
-- =====================================================
-- Drop all existing storage policies for this bucket
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (qual::text LIKE '%service_tracker_attachments%' 
             OR with_check::text LIKE '%service_tracker_attachments%'
             OR policyname LIKE '%service_tracker%')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Create permissive storage policies
CREATE POLICY "policy_storage_service_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service_tracker_attachments'
);

CREATE POLICY "policy_storage_service_attachments_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'service_tracker_attachments'
);

CREATE POLICY "policy_storage_service_attachments_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service_tracker_attachments'
)
WITH CHECK (
  bucket_id = 'service_tracker_attachments'
);

CREATE POLICY "policy_storage_service_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service_tracker_attachments'
);

-- =====================================================
-- STEP 6: Verify everything is set up correctly
-- =====================================================
-- Check table policies
SELECT 
  'Table Policies' AS policy_type,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN with_check = 'true' THEN 'Permissive'
    ELSE with_check::text
  END AS with_check_clause
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
ORDER BY policyname;

-- Check storage policies
SELECT 
  'Storage Policies' AS policy_type,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%service_tracker%'
ORDER BY policyname;

-- Final status check
SELECT 
  'Table exists' AS check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_tracker_attachments'
  ) AS result
UNION ALL
SELECT 
  'RLS enabled' AS check_type,
  rowsecurity AS result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_attachments'
UNION ALL
SELECT 
  'Policies exist' AS check_type,
  (COUNT(*) > 0)::boolean AS result
FROM pg_policies
WHERE tablename = 'service_tracker_attachments';


-- Diagnostic and Fix Script for service_tracker_attachments RLS Issues
-- Run this in Supabase SQL Editor

-- Step 1: Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'service_tracker_attachments'
) AS table_exists;

-- Step 2: Check current RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_attachments';

-- Step 3: List all existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_tracker_attachments';

-- Step 4: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view service attachments in their tenant" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Users can insert service attachments in their tenant" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Users can delete service attachments in their tenant" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to view service attachments" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to insert service attachments" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to delete service attachments" ON service_tracker_attachments;

-- Step 5: Ensure table exists (create if not)
CREATE TABLE IF NOT EXISTS service_tracker_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_tracker_id UUID REFERENCES service_trackers(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Ensure tenant_id column exists
ALTER TABLE service_tracker_attachments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 7: Enable RLS
ALTER TABLE service_tracker_attachments ENABLE ROW LEVEL SECURITY;

-- Step 8: Create very simple, permissive policies
-- SELECT - Allow all authenticated users
CREATE POLICY "service_attachments_select_policy"
ON service_tracker_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT - Allow all authenticated users (this is the one causing issues)
CREATE POLICY "service_attachments_insert_policy"
ON service_tracker_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE - Allow all authenticated users
CREATE POLICY "service_attachments_delete_policy"
ON service_tracker_attachments FOR DELETE
TO authenticated
USING (true);

-- Step 9: Verify policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
ORDER BY policyname;

-- Step 10: Check and fix Storage Bucket RLS policies
-- Storage bucket policies are on storage.objects table
-- Drop existing policies for service_tracker_attachments bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload to service_tracker_attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read from service_tracker_attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from service_tracker_attachments" ON storage.objects;

-- Create permissive storage policies for service_tracker_attachments bucket
CREATE POLICY "Allow authenticated uploads to service_tracker_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service_tracker_attachments'
);

CREATE POLICY "Allow authenticated reads from service_tracker_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'service_tracker_attachments'
);

CREATE POLICY "Allow authenticated deletes from service_tracker_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service_tracker_attachments'
);

-- Step 11: If still having issues, you can temporarily disable RLS (uncomment below)
-- WARNING: This disables security - only use for testing!
-- ALTER TABLE service_tracker_attachments DISABLE ROW LEVEL SECURITY;

-- Step 12: Final verification - Check everything is set up correctly
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
  rowsecurity::boolean AS result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_attachments'
UNION ALL
SELECT 
  'Policies exist' AS check_type,
  (COUNT(*) > 0)::boolean AS result
FROM pg_policies
WHERE tablename = 'service_tracker_attachments';


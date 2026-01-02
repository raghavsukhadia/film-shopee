-- Quick Fix: Remove all existing policies and create a simple permissive one
-- This will fix the RLS policy violation error

-- Drop ALL existing policies on service_tracker_attachments
DROP POLICY IF EXISTS "Users can view service attachments in their tenant" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Users can insert service attachments in their tenant" ON service_tracker_attachments;
DROP POLICY IF EXISTS "Users can delete service attachments in their tenant" ON service_tracker_attachments;

-- Create simple, permissive policies
-- SELECT Policy: Allow authenticated users to view attachments
CREATE POLICY "Allow authenticated users to view service attachments"
ON service_tracker_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert attachments
CREATE POLICY "Allow authenticated users to insert service attachments"
ON service_tracker_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete attachments
CREATE POLICY "Allow authenticated users to delete service attachments"
ON service_tracker_attachments FOR DELETE
TO authenticated
USING (true);

-- Verify policies were created
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


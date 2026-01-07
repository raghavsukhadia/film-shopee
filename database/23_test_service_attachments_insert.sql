-- Test Script: Verify RLS policies work correctly
-- Run this to test if inserts are allowed

-- First, check current user authentication
SELECT 
  auth.uid() AS current_user_id,
  auth.role() AS current_role;

-- Check if user has tenant_users record
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role
FROM tenant_users tu
WHERE tu.user_id = auth.uid();

-- Check existing policies on service_tracker_attachments
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
ORDER BY policyname;

-- Try to insert a test record (this will show if RLS is blocking)
-- Note: This will fail if RLS is blocking, but will show the exact error
INSERT INTO service_tracker_attachments (
  service_tracker_id,
  tenant_id,
  file_name,
  file_url,
  file_type,
  file_size
)
SELECT 
  (SELECT id FROM service_trackers LIMIT 1) AS service_tracker_id,
  (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1) AS tenant_id,
  'test_file.txt' AS file_name,
  'https://example.com/test' AS file_url,
  'text/plain' AS file_type,
  100 AS file_size
WHERE EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid())
LIMIT 1;

-- If insert succeeded, show the result
SELECT 'Test insert successful!' AS result;


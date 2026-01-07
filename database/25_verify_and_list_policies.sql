-- Verification Script: Check current RLS policies for service_tracker_attachments
-- Run this to see what policies are currently active

-- =====================================================
-- Check Table Policies
-- =====================================================
SELECT 
  'Table Policies' AS policy_type,
  policyname,
  cmd AS operation,
  roles,
  CASE 
    WHEN qual IS NULL OR qual = '' THEN 'No USING clause'
    ELSE 'Has USING clause'
  END AS using_clause,
  CASE 
    WHEN with_check IS NULL OR with_check = '' THEN 'No WITH CHECK clause'
    WHEN with_check::text = 'true' THEN 'Permissive (true)'
    ELSE 'Has WITH CHECK clause'
  END AS with_check_clause
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
ORDER BY cmd, policyname;

-- =====================================================
-- Check Storage Bucket Policies
-- =====================================================
SELECT 
  'Storage Policies' AS policy_type,
  policyname,
  cmd AS operation,
  roles,
  CASE 
    WHEN qual IS NULL OR qual = '' THEN 'No USING clause'
    ELSE 'Has USING clause'
  END AS using_clause,
  CASE 
    WHEN with_check IS NULL OR with_check = '' THEN 'No WITH CHECK clause'
    WHEN with_check::text LIKE '%service_tracker_attachments%' THEN 'Bucket check present'
    ELSE 'Has WITH CHECK clause'
  END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
  policyname LIKE '%service_tracker%' 
  OR qual::text LIKE '%service_tracker_attachments%'
  OR with_check::text LIKE '%service_tracker_attachments%'
)
ORDER BY cmd, policyname;

-- =====================================================
-- Summary Status
-- =====================================================
SELECT 
  'Summary' AS info_type,
  'Table Policies Count' AS metric,
  COUNT(*)::text AS value
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
UNION ALL
SELECT 
  'Summary' AS info_type,
  'Storage Policies Count' AS metric,
  COUNT(*)::text AS value
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
  policyname LIKE '%service_tracker%' 
  OR qual::text LIKE '%service_tracker_attachments%'
  OR with_check::text LIKE '%service_tracker_attachments%'
)
UNION ALL
SELECT 
  'Summary' AS info_type,
  'RLS Enabled' AS metric,
  rowsecurity::text AS value
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_attachments';


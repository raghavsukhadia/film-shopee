-- Quick Check: Verify policy names match the fix script
-- The fix script should create policies with these names:
-- - policy_service_attachments_select_all
-- - policy_service_attachments_insert_all (CRITICAL for uploads)
-- - policy_service_attachments_update_all
-- - policy_service_attachments_delete_all

-- Check table policies
SELECT 
  policyname,
  cmd AS operation,
  CASE 
    WHEN cmd = 'INSERT' AND with_check::text = 'true' THEN '✅ CORRECT (Permissive)'
    WHEN cmd = 'INSERT' THEN '❌ WRONG (Not permissive)'
    WHEN cmd = 'SELECT' AND qual::text = 'true' THEN '✅ CORRECT (Permissive)'
    WHEN cmd = 'SELECT' THEN '⚠️ Check USING clause'
    ELSE '✅ OK'
  END AS status,
  with_check::text AS with_check_value,
  qual::text AS using_value
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
ORDER BY cmd, policyname;

-- Check if INSERT policy exists and is permissive
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO INSERT POLICY FOUND - Run fix script!'
    WHEN COUNT(*) > 0 AND bool_or(with_check::text = 'true') THEN '✅ INSERT policy exists and is permissive'
    ELSE '❌ INSERT policy exists but is NOT permissive - Run fix script!'
  END AS insert_policy_status
FROM pg_policies
WHERE tablename = 'service_tracker_attachments'
AND cmd = 'INSERT';


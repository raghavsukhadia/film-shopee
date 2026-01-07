-- =====================================================
-- Make RLS Policies Idempotent
-- =====================================================
-- This script adds DROP POLICY IF EXISTS before all CREATE POLICY statements
-- Run this if you get "policy already exists" errors
-- =====================================================
-- Note: This is a helper script. The main 02_rls_policies.sql file
-- has been updated to include DROP statements, so this is mainly
-- for reference or if you need to re-run policies manually.
-- =====================================================

-- This script demonstrates the pattern. The main 02_rls_policies.sql
-- file has been updated with DROP POLICY IF EXISTS statements.

-- Example pattern:
-- DROP POLICY IF EXISTS "Policy Name" ON table_name;
-- CREATE POLICY "Policy Name" ON table_name ...

-- If you're getting "policy already exists" errors, you can:
-- 1. Run the updated 02_rls_policies.sql (it now includes DROP statements)
-- 2. Or manually drop specific policies before recreating them

-- To drop all policies for a specific table:
-- DROP POLICY IF EXISTS "Policy Name 1" ON table_name;
-- DROP POLICY IF EXISTS "Policy Name 2" ON table_name;
-- ... etc

-- Then recreate them with CREATE POLICY statements.


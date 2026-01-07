-- =====================================================
-- Fix RLS Policy for system_settings to allow super admins
-- to manage all settings (not just platform-wide)
-- =====================================================
-- This fixes the issue where super admins cannot save
-- tenant-specific system_settings (like company information)
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Super admins can manage platform settings" ON system_settings;

-- Create new policy that allows super admins to manage all system_settings
CREATE POLICY "Super admins can manage all system settings"
    ON system_settings FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- Verification
-- =====================================================
-- After running this script, verify the policy exists:
-- SELECT * FROM pg_policies 
-- WHERE tablename = 'system_settings' 
-- AND policyname = 'Super admins can manage all system settings';

-- =====================================================


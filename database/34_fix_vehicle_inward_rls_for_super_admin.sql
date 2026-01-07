-- =====================================================
-- Fix RLS Policies for vehicle_inward to allow super admins
-- to insert, update, and delete records
-- =====================================================
-- This fixes the issue where super admins cannot create
-- vehicle inward entries due to RLS policy restrictions
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert vehicle_inward in their tenant" ON vehicle_inward;
DROP POLICY IF EXISTS "Users can update vehicle_inward in their tenant" ON vehicle_inward;
DROP POLICY IF EXISTS "Users can delete vehicle_inward in their tenant" ON vehicle_inward;

-- Recreate policies with super admin access
CREATE POLICY "Users can insert vehicle_inward in their tenant"
    ON vehicle_inward FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can update vehicle_inward in their tenant"
    ON vehicle_inward FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can delete vehicle_inward in their tenant"
    ON vehicle_inward FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- Verification
-- =====================================================
-- After running this script, verify the policies exist:
-- SELECT * FROM pg_policies 
-- WHERE tablename = 'vehicle_inward';

-- =====================================================


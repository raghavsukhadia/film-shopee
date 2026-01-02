-- =====================================================
-- Fix All RLS Policies for Super Admin Access
-- =====================================================
-- This comprehensive script fixes all RLS policies to allow
-- super admins to perform INSERT/UPDATE/DELETE operations
-- on all tables, not just SELECT operations.
-- 
-- This script is idempotent - safe to run multiple times
-- =====================================================

-- =====================================================
-- CUSTOMERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON customers;

CREATE POLICY "Users can insert customers in their tenant"
    ON customers FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can update customers in their tenant"
    ON customers FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can delete customers in their tenant"
    ON customers FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- VEHICLES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert vehicles in their tenant" ON vehicles;
DROP POLICY IF EXISTS "Users can update vehicles in their tenant" ON vehicles;
DROP POLICY IF EXISTS "Users can delete vehicles in their tenant" ON vehicles;

CREATE POLICY "Users can insert vehicles in their tenant"
    ON vehicles FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can update vehicles in their tenant"
    ON vehicles FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can delete vehicles in their tenant"
    ON vehicles FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- WORK_ORDERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage work_orders in their tenant" ON work_orders;

CREATE POLICY "Users can manage work_orders in their tenant"
    ON work_orders FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- SERVICE_TRACKERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage service_trackers in their tenant" ON service_trackers;

CREATE POLICY "Users can manage service_trackers in their tenant"
    ON service_trackers FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- CALL_FOLLOW_UP POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage call_follow_up in their tenant" ON call_follow_up;

CREATE POLICY "Users can manage call_follow_up in their tenant"
    ON call_follow_up FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- CUSTOMER_REQUIREMENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage customer_requirements in their tenant" ON customer_requirements;

CREATE POLICY "Users can manage customer_requirements in their tenant"
    ON customer_requirements FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage invoices in their tenant" ON invoices;

CREATE POLICY "Users can manage invoices in their tenant"
    ON invoices FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage payments in their tenant" ON payments;

CREATE POLICY "Users can manage payments in their tenant"
    ON payments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- EXPENSES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage expenses in their tenant" ON expenses;

CREATE POLICY "Users can manage expenses in their tenant"
    ON expenses FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- LOCATIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage locations in their tenant" ON locations;

CREATE POLICY "Users can manage locations in their tenant"
    ON locations FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- VEHICLE_TYPES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage vehicle_types in their tenant" ON vehicle_types;

CREATE POLICY "Users can manage vehicle_types in their tenant"
    ON vehicle_types FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- DEPARTMENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage departments in their tenant" ON departments;

CREATE POLICY "Users can manage departments in their tenant"
    ON departments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage comments in their tenant" ON comments;

CREATE POLICY "Users can manage comments in their tenant"
    ON comments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- MESSAGE_TEMPLATES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage message templates for their tenant" ON message_templates;

CREATE POLICY "Users can manage message templates for their tenant"
    ON message_templates FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this script, you can verify the policies were created:

-- Check policies for a specific table (example: customers):
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'customers';

-- Check all policies that include super admin access:
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE qual::text LIKE '%is_super_admin%' 
--    OR with_check::text LIKE '%is_super_admin%'
-- ORDER BY tablename, policyname;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script has updated RLS policies for the following tables:
-- ✅ customers (INSERT, UPDATE, DELETE)
-- ✅ vehicles (INSERT, UPDATE, DELETE)
-- ✅ work_orders (ALL)
-- ✅ service_trackers (ALL)
-- ✅ call_follow_up (ALL)
-- ✅ customer_requirements (ALL)
-- ✅ invoices (ALL)
-- ✅ payments (ALL)
-- ✅ expenses (ALL)
-- ✅ locations (ALL)
-- ✅ vehicle_types (ALL)
-- ✅ departments (ALL)
-- ✅ comments (ALL)
-- ✅ message_templates (ALL)
--
-- Note: vehicle_inward and system_settings were already fixed
-- in previous migration scripts (34 and 33 respectively).
-- =====================================================


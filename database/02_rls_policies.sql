-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- This file enables RLS and creates policies for all tables
-- Execute this file after 01_schema.sql
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inward ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_follow_up ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inward_comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admins WHERE super_admins.user_id = is_super_admin.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM tenant_users 
        WHERE tenant_users.user_id = get_user_tenant_id.user_id 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TENANTS POLICIES
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Super admins can update tenants" ON tenants;

-- Super admins can see all tenants
CREATE POLICY "Super admins can view all tenants"
    ON tenants FOR SELECT
    USING (is_super_admin(auth.uid()));

-- Users can view their own tenant
CREATE POLICY "Users can view their tenant"
    ON tenants FOR SELECT
    USING (
        id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Super admins can insert tenants
CREATE POLICY "Super admins can insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update tenants
CREATE POLICY "Super admins can update tenants"
    ON tenants FOR UPDATE
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- SUPER_ADMINS POLICIES
-- =====================================================

-- Users can check if they themselves are super admins (needed for login)
CREATE POLICY "Users can check if they are super admin"
    ON super_admins FOR SELECT
    USING (user_id = auth.uid());

-- Super admins can view all super admins
CREATE POLICY "Super admins can view all super admins"
    ON super_admins FOR SELECT
    USING (is_super_admin(auth.uid()));

-- Only service role can insert/update super admins (done via SQL)
-- No policy needed - will be done via service role key

-- =====================================================
-- TENANT_USERS POLICIES
-- =====================================================

-- Users can view tenant_users for their tenant
-- Use SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Users can view tenant_users for their tenant"
    ON tenant_users FOR SELECT
    USING (
        tenant_id = get_user_tenant_id(auth.uid())
        OR is_super_admin(auth.uid())
    );

-- Super admins can manage tenant_users
CREATE POLICY "Super admins can manage tenant_users"
    ON tenant_users FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view all profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant"
    ON profiles FOR SELECT
    USING (
        id IN (
            SELECT user_id FROM tenant_users 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid()
            )
        )
        OR is_super_admin(auth.uid())
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
    ON profiles FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- CUSTOMERS POLICIES
-- =====================================================

-- Users can view customers in their tenant
CREATE POLICY "Users can view customers in their tenant"
    ON customers FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can insert customers in their tenant
CREATE POLICY "Users can insert customers in their tenant"
    ON customers FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update customers in their tenant
CREATE POLICY "Users can update customers in their tenant"
    ON customers FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete customers in their tenant
CREATE POLICY "Users can delete customers in their tenant"
    ON customers FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VEHICLES POLICIES
-- =====================================================

-- Users can view vehicles in their tenant
CREATE POLICY "Users can view vehicles in their tenant"
    ON vehicles FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can insert vehicles in their tenant
CREATE POLICY "Users can insert vehicles in their tenant"
    ON vehicles FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update vehicles in their tenant
CREATE POLICY "Users can update vehicles in their tenant"
    ON vehicles FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete vehicles in their tenant
CREATE POLICY "Users can delete vehicles in their tenant"
    ON vehicles FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VEHICLE_INWARD POLICIES
-- =====================================================

-- Users can view vehicle_inward in their tenant
CREATE POLICY "Users can view vehicle_inward in their tenant"
    ON vehicle_inward FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can insert vehicle_inward in their tenant
CREATE POLICY "Users can insert vehicle_inward in their tenant"
    ON vehicle_inward FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update vehicle_inward in their tenant
CREATE POLICY "Users can update vehicle_inward in their tenant"
    ON vehicle_inward FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete vehicle_inward in their tenant
CREATE POLICY "Users can delete vehicle_inward in their tenant"
    ON vehicle_inward FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- WORK_ORDERS POLICIES
-- =====================================================

-- Users can view work_orders in their tenant
CREATE POLICY "Users can view work_orders in their tenant"
    ON work_orders FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage work_orders in their tenant
CREATE POLICY "Users can manage work_orders in their tenant"
    ON work_orders FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE_TRACKERS POLICIES
-- =====================================================

-- Users can view service_trackers in their tenant
CREATE POLICY "Users can view service_trackers in their tenant"
    ON service_trackers FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage service_trackers in their tenant
CREATE POLICY "Users can manage service_trackers in their tenant"
    ON service_trackers FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- CALL_FOLLOW_UP POLICIES
-- =====================================================

-- Users can view call_follow_up in their tenant
CREATE POLICY "Users can view call_follow_up in their tenant"
    ON call_follow_up FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage call_follow_up in their tenant
CREATE POLICY "Users can manage call_follow_up in their tenant"
    ON call_follow_up FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- CUSTOMER_REQUIREMENTS POLICIES
-- =====================================================

-- Users can view customer_requirements in their tenant
CREATE POLICY "Users can view customer_requirements in their tenant"
    ON customer_requirements FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage customer_requirements in their tenant
CREATE POLICY "Users can manage customer_requirements in their tenant"
    ON customer_requirements FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

-- Users can view invoices in their tenant
CREATE POLICY "Users can view invoices in their tenant"
    ON invoices FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage invoices in their tenant
CREATE POLICY "Users can manage invoices in their tenant"
    ON invoices FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

-- Users can view payments in their tenant
CREATE POLICY "Users can view payments in their tenant"
    ON payments FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage payments in their tenant
CREATE POLICY "Users can manage payments in their tenant"
    ON payments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- EXPENSES POLICIES
-- =====================================================

-- Users can view expenses in their tenant
CREATE POLICY "Users can view expenses in their tenant"
    ON expenses FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage expenses in their tenant
CREATE POLICY "Users can manage expenses in their tenant"
    ON expenses FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================

-- Users can view subscriptions for their tenant
CREATE POLICY "Users can view subscriptions for their tenant"
    ON subscriptions FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Super admins can manage subscriptions
CREATE POLICY "Super admins can manage subscriptions"
    ON subscriptions FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- TENANT_PAYMENT_PROOFS POLICIES
-- =====================================================

-- Tenant admins can view their tenant's payment proofs
CREATE POLICY "Tenant admins can view their payment proofs"
    ON tenant_payment_proofs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Tenant admins can insert payment proofs for their tenant
CREATE POLICY "Tenant admins can insert payment proofs"
    ON tenant_payment_proofs FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Super admins can manage all payment proofs
CREATE POLICY "Super admins can manage all payment proofs"
    ON tenant_payment_proofs FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- SYSTEM_SETTINGS POLICIES
-- =====================================================

-- Users can view system_settings for their tenant and platform-wide
CREATE POLICY "Users can view system_settings"
    ON system_settings FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR tenant_id IS NULL -- Platform-wide settings
        OR is_super_admin(auth.uid())
    );

-- Users can manage system_settings for their tenant
CREATE POLICY "Users can manage system_settings for their tenant"
    ON system_settings FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Super admins can manage platform-wide settings
CREATE POLICY "Super admins can manage platform settings"
    ON system_settings FOR ALL
    USING (
        is_super_admin(auth.uid()) AND tenant_id IS NULL
    );

-- =====================================================
-- LOCATIONS POLICIES
-- =====================================================

-- Users can view locations in their tenant
CREATE POLICY "Users can view locations in their tenant"
    ON locations FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage locations in their tenant
CREATE POLICY "Users can manage locations in their tenant"
    ON locations FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VEHICLE_TYPES POLICIES
-- =====================================================

-- Users can view vehicle_types in their tenant
CREATE POLICY "Users can view vehicle_types in their tenant"
    ON vehicle_types FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage vehicle_types in their tenant
CREATE POLICY "Users can manage vehicle_types in their tenant"
    ON vehicle_types FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- DEPARTMENTS POLICIES
-- =====================================================

-- Users can view departments in their tenant
CREATE POLICY "Users can view departments in their tenant"
    ON departments FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage departments in their tenant
CREATE POLICY "Users can manage departments in their tenant"
    ON departments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_super_admin(auth.uid())
    );

-- Users can update their own notifications
CREATE POLICY "Users can update their notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================

-- Users can view comments in their tenant
CREATE POLICY "Users can view comments in their tenant"
    ON comments FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage comments in their tenant
CREATE POLICY "Users can manage comments in their tenant"
    ON comments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- MESSAGE_TEMPLATES POLICIES
-- =====================================================

-- Users can view message templates for their tenant or platform defaults
CREATE POLICY "Users can view message templates for their tenant"
    ON message_templates FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR tenant_id IS NULL -- Platform-wide defaults
        OR is_super_admin(auth.uid())
    );

-- Users can manage message templates for their tenant
CREATE POLICY "Users can manage message templates for their tenant"
    ON message_templates FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Super admins can manage all message templates
CREATE POLICY "Super admins can manage all message templates"
    ON message_templates FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================


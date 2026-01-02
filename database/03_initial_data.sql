-- =====================================================
-- Initial Seed Data
-- =====================================================
-- This file contains initial data for the application
-- Execute this file after 02_rls_policies.sql
-- =====================================================

-- =====================================================
-- PLATFORM-WIDE SYSTEM SETTINGS
-- =====================================================

-- Default subscription plans
INSERT INTO system_settings (tenant_id, setting_key, setting_value, setting_type, description)
VALUES 
(
    NULL, -- Platform-wide setting
    'subscription_plans',
    '[
        {
            "plan_name": "annual",
            "plan_display_name": "Annual Plan",
            "amount": 12000,
            "currency": "INR",
            "billing_cycle": "annual",
            "trial_days": 24,
            "is_active": true,
            "features": [
                "Unlimited vehicles",
                "Unlimited users",
                "Advanced reporting",
                "WhatsApp integration",
                "Email support"
            ]
        },
        {
            "plan_name": "monthly",
            "plan_display_name": "Monthly Plan",
            "amount": 1200,
            "currency": "INR",
            "billing_cycle": "monthly",
            "trial_days": 7,
            "is_active": true,
            "features": [
                "Unlimited vehicles",
                "Unlimited users",
                "Basic reporting",
                "Email support"
            ]
        }
    ]',
    'json',
    'Available subscription plans for tenants'
),
(
    NULL,
    'support_email',
    'info@zoravo.in',
    'string',
    'Platform support email address'
),
(
    NULL,
    'from_email',
    'noreply@zoravo.in',
    'string',
    'Default from email for system emails'
),
(
    NULL,
    'reply_to_email',
    'info@zoravo.in',
    'string',
    'Default reply-to email for system emails'
)
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- =====================================================
-- NOTE: Super Admin Setup
-- =====================================================
-- To create a super admin:
-- 1. Create a user through Supabase Auth (Dashboard > Authentication > Users)
-- 2. Run the following SQL (replace USER_ID with the actual user ID):
--
-- INSERT INTO super_admins (user_id)
-- VALUES ('USER_ID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;
--
-- 3. Create a profile for the super admin:
--
-- INSERT INTO profiles (id, email, name, role)
-- VALUES ('USER_ID_HERE', 'admin@example.com', 'Super Admin', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
--
-- =====================================================

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment the following sections if you want sample data for testing

/*
-- Sample Tenant
INSERT INTO tenants (name, tenant_code, workspace_url, email, phone, city, state, is_active)
VALUES 
(
    'Sample Car Accessories',
    'SAMPLE01',
    'sample',
    'sample@example.com',
    '+91-9876543210',
    'Mumbai',
    'Maharashtra',
    true
)
ON CONFLICT (tenant_code) DO NOTHING;

-- Get the tenant ID (you'll need to replace this with actual tenant ID)
-- DO $$
-- DECLARE
--     v_tenant_id UUID;
-- BEGIN
--     SELECT id INTO v_tenant_id FROM tenants WHERE tenant_code = 'SAMPLE01';
--     
--     -- Sample Location
--     INSERT INTO locations (tenant_id, name, address, city, state, pincode)
--     VALUES (v_tenant_id, 'Main Workshop', '123 Main Street', 'Mumbai', 'Maharashtra', '400001')
--     ON CONFLICT DO NOTHING;
--     
--     -- Sample Vehicle Types
--     INSERT INTO vehicle_types (tenant_id, name, description)
--     VALUES 
--         (v_tenant_id, 'Sedan', '4-door sedan vehicles'),
--         (v_tenant_id, 'SUV', 'Sports Utility Vehicles'),
--         (v_tenant_id, 'Hatchback', 'Compact hatchback vehicles')
--     ON CONFLICT DO NOTHING;
--     
--     -- Sample Departments
--     INSERT INTO departments (tenant_id, name, description, color)
--     VALUES 
--         (v_tenant_id, 'Accessories', 'Car accessories installation', '#3B82F6'),
--         (v_tenant_id, 'Service', 'Vehicle service and maintenance', '#10B981'),
--         (v_tenant_id, 'Body Work', 'Body repair and painting', '#F59E0B')
--     ON CONFLICT DO NOTHING;
-- END $$;
*/

-- =====================================================
-- END OF INITIAL DATA
-- =====================================================


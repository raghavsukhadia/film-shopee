-- =====================================================
-- Setup RS Car Accessories Tenant
-- =====================================================
-- This script creates the default "RS Car Accessories" tenant
-- and links raghav@sunkool.in as the admin
-- =====================================================

-- Step 1: Create RS Car Accessories Tenant
INSERT INTO tenants (
    id,
    name,
    tenant_code,
    workspace_url,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    is_active
)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- Fixed UUID for RS Car Accessories
    'RS Car Accessories',
    'RS01',
    'rs-car',
    'info@zoravo.in',
    '081491 11110',
    '510, Western Palace, opposite Park, Congress Nagar',
    'Nagpur',
    'Maharashtra',
    '440012',
    true
)
ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    tenant_code = EXCLUDED.tenant_code,
    workspace_url = EXCLUDED.workspace_url,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    is_active = true;

-- Step 2: Link raghav@sunkool.in as admin for RS Car Accessories
-- Replace USER_ID_HERE with the actual user ID from Supabase Auth
-- You can find it in Supabase Dashboard > Authentication > Users
INSERT INTO tenant_users (tenant_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- RS Car Accessories tenant ID
    '5efd1861-9238-4022-a2c0-a1fbc99b0fbb',  -- Replace with actual user ID if different
    'admin'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET role = 'admin';

-- Step 3: Verify the setup
SELECT 
    t.name as tenant_name,
    t.tenant_code,
    t.workspace_url,
    p.email,
    p.name as user_name,
    tu.role
FROM tenants t
JOIN tenant_users tu ON t.id = tu.tenant_id
JOIN profiles p ON tu.user_id = p.id
WHERE t.id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- Note: After running this script:
-- 1. The user raghav@sunkool.in will be admin of RS Car Accessories
-- 2. They can log in using tenant login with workspace URL: rs-car
-- 3. Or they can continue using super admin login
-- =====================================================


-- =====================================================
-- Create Super Admin User
-- =====================================================
-- Replace USER_ID_HERE with the actual User ID from Supabase Auth
-- Replace the email and name with the actual user details
-- =====================================================

-- Step 1: Insert into super_admins table
INSERT INTO super_admins (user_id)
VALUES ('5efd1861-9238-4022-a2c0-a1fbc99b0fbb')
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Create profile for super admin
INSERT INTO profiles (id, email, name, role)
VALUES (
    '5efd1861-9238-4022-a2c0-a1fbc99b0fbb',
    'raghav@sunkool.in',  -- Replace with actual email
    'Super Admin',         -- Replace with actual name
    'admin'
)
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'admin';

-- =====================================================
-- To find your User ID:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click on your user
-- 3. Copy the "User UID" value
-- =====================================================


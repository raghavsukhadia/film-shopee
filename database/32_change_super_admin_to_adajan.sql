-- =====================================================
-- Change Super Admin to Adajan@filmshoppee.com
-- =====================================================
-- This script changes the super admin from the old user to Adajan@filmshoppee.com
-- 
-- This script is ready to execute. It will:
-- 1. Remove the old super admin (raghav@sunkool.in)
-- 2. Add the new super admin (Adajan@filmshoppee.com)
-- 3. Update the profile for the new super admin
-- =====================================================

-- Step 1: Remove old super admin (raghav@sunkool.in)
-- This removes the old super admin entry
DELETE FROM super_admins 
WHERE user_id = '5efd1861-9238-4022-a2c0-a1fbc99b0fbb';

-- Step 2: Add new super admin (Adajan@filmshoppee.com)
INSERT INTO super_admins (user_id)
VALUES ('fa43e252-81a9-4bf3-bad3-db5d9af102f6')
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Update or create profile for new super admin
INSERT INTO profiles (id, email, name, role)
VALUES (
    'fa43e252-81a9-4bf3-bad3-db5d9af102f6',
    'Adajan@filmshoppee.com',
    'Super Admin',
    'admin'
)
ON CONFLICT (id) DO UPDATE 
SET 
    email = 'Adajan@filmshoppee.com',
    name = 'Super Admin',
    role = 'admin';

-- =====================================================
-- Verification Queries
-- =====================================================
-- After running this script, verify the changes:

-- Check super admin:
-- SELECT sa.*, p.email, p.name 
-- FROM super_admins sa
-- JOIN profiles p ON sa.user_id = p.id
-- WHERE p.email = 'Adajan@filmshoppee.com';

-- Check old super admin is removed:
-- SELECT * FROM super_admins 
-- WHERE user_id = '5efd1861-9238-4022-a2c0-a1fbc99b0fbb';
-- (Should return no rows)

-- =====================================================


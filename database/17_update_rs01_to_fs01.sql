-- Migration: Update existing RS01 tenant to FS01
-- This updates the RS Car Accessories tenant to use FS01 code format

-- Update RS01 tenant to FS01
UPDATE tenants
SET 
    tenant_code = 'FS01',
    workspace_url = 'tenant-fs01'
WHERE tenant_code = 'RS01';

-- Verify the update
SELECT 
    id,
    name,
    tenant_code,
    workspace_url,
    created_at
FROM tenants
WHERE tenant_code = 'FS01';

-- Note: If you have other tenants with RS codes, you can update them similarly:
-- UPDATE tenants SET tenant_code = 'FS02', workspace_url = 'tenant-fs02' WHERE tenant_code = 'RS02';
-- etc.


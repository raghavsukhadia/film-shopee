-- Migration: Update workspace URLs to new domain format
-- This migration updates existing tenant workspace_urls from old format to new format
-- Old format: tenant-fs01, tenant-fs02, etc.
-- New format: filmshopeezoravofs01, filmshopeezoravofs02, etc.
-- Main domain: filmshopeezoravo.in (for admin access)

-- Update workspace URLs for tenants with FS codes
-- Convert tenant-fs01 → filmshopeezoravofs01
-- Convert tenant-fs02 → filmshopeezoravofs02
-- etc.

UPDATE tenants
SET workspace_url = 'filmshopeezoravo' || LOWER(tenant_code)
WHERE workspace_url LIKE 'tenant-%'
  AND tenant_code ~ '^FS[0-9]+$';

-- Handle special case: RS Car Accessories (FS01)
-- If it has a different workspace_url format, update it
UPDATE tenants
SET workspace_url = 'filmshopeezoravofs01'
WHERE tenant_code = 'FS01'
  AND workspace_url != 'filmshopeezoravofs01';

-- Handle legacy workspace URLs that might not follow tenant- pattern
-- Update any workspace_url that starts with old patterns
UPDATE tenants
SET workspace_url = 'filmshopeezoravo' || LOWER(tenant_code)
WHERE tenant_code ~ '^FS[0-9]+$'
  AND workspace_url NOT LIKE 'filmshopeezoravo%'
  AND workspace_url != 'admin'
  AND workspace_url != 'rs-car-accessories-nagpur';

-- Note: Admin workspace (workspace_url = 'admin') should remain as 'admin'
-- The main domain filmshopeezoravo.in will be handled in application logic

-- Verify the updates
SELECT 
    id,
    name,
    tenant_code,
    workspace_url,
    created_at
FROM tenants
ORDER BY 
    CASE 
        WHEN tenant_code ~ '^FS[0-9]+$' THEN CAST(SUBSTRING(tenant_code FROM 3) AS INTEGER)
        ELSE 9999
    END;

-- Show summary of workspace URL formats
SELECT 
    CASE 
        WHEN workspace_url LIKE 'filmshopeezoravo%' THEN 'New Format'
        WHEN workspace_url = 'admin' THEN 'Admin'
        ELSE 'Legacy Format'
    END AS format_type,
    COUNT(*) AS count
FROM tenants
GROUP BY format_type;


-- Migration: Update tenant codes to FS01, FS02, FS03 format
-- This migration updates existing tenant codes from Z01, Z02 format to FS01, FS02 format
-- and ensures all new tenants follow the FS## pattern

-- Function to get the next FS tenant code
CREATE OR REPLACE FUNCTION get_next_fs_tenant_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    max_code VARCHAR(50);
    next_num INTEGER;
BEGIN
    -- Get the highest FS code number
    SELECT tenant_code INTO max_code
    FROM tenants
    WHERE tenant_code ~ '^FS[0-9]+$'
    ORDER BY 
        CAST(SUBSTRING(tenant_code FROM 3) AS INTEGER) DESC
    LIMIT 1;
    
    -- If no FS codes exist, start with FS01
    IF max_code IS NULL THEN
        -- Check if there are any Z codes to migrate
        SELECT tenant_code INTO max_code
        FROM tenants
        WHERE tenant_code ~ '^Z[0-9]+$'
        ORDER BY 
            CAST(SUBSTRING(tenant_code FROM 2) AS INTEGER) DESC
        LIMIT 1;
        
        IF max_code IS NULL THEN
            RETURN 'FS01';
        ELSE
            -- Convert Z code to FS code
            next_num := CAST(SUBSTRING(max_code FROM 2) AS INTEGER);
            RETURN 'FS' || LPAD(next_num::TEXT, 2, '0');
        END IF;
    ELSE
        -- Extract number from FS code and increment
        next_num := CAST(SUBSTRING(max_code FROM 3) AS INTEGER) + 1;
        RETURN 'FS' || LPAD(next_num::TEXT, 2, '0');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Optionally migrate existing Z codes to FS codes
-- Uncomment the following if you want to automatically convert Z01, Z02, etc. to FS01, FS02, etc.
/*
DO $$
DECLARE
    tenant_record RECORD;
    new_code VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    -- Get all tenants with Z codes, ordered by creation date
    FOR tenant_record IN 
        SELECT id, tenant_code, created_at
        FROM tenants
        WHERE tenant_code ~ '^Z[0-9]+$'
        ORDER BY created_at ASC
    LOOP
        -- Generate new FS code
        new_code := 'FS' || LPAD(counter::TEXT, 2, '0');
        
        -- Update tenant code
        UPDATE tenants
        SET tenant_code = new_code,
            workspace_url = 'tenant-' || LOWER(new_code)
        WHERE id = tenant_record.id;
        
        counter := counter + 1;
    END LOOP;
END $$;
*/

-- Verify the function works
SELECT get_next_fs_tenant_code() AS next_tenant_code;

-- Show current tenant codes
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
        WHEN tenant_code ~ '^Z[0-9]+$' THEN CAST(SUBSTRING(tenant_code FROM 2) AS INTEGER)
        ELSE 9999
    END;


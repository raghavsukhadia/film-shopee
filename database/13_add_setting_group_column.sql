-- =====================================================
-- Add setting_group column to system_settings table
-- =====================================================
-- This column is used to organize settings into groups
-- (e.g., 'whatsapp_notifications', 'profile', 'company', 'platform', etc.)
-- =====================================================

-- Add setting_group column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'system_settings' 
        AND column_name = 'setting_group'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN setting_group VARCHAR(100);
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_system_settings_setting_group 
        ON system_settings(setting_group);
        
        -- Update existing records to have a default setting_group based on setting_key prefix
        UPDATE system_settings 
        SET setting_group = CASE
            WHEN setting_key LIKE 'whatsapp_%' THEN 'whatsapp_notifications'
            WHEN setting_key LIKE 'profile_%' THEN 'profile'
            WHEN setting_key LIKE 'company_%' THEN 'company'
            WHEN setting_key LIKE 'platform_%' THEN 'platform'
            WHEN setting_key LIKE 'email_%' THEN 'email'
            WHEN setting_key LIKE 'subscription_%' THEN 'subscription'
            ELSE 'general'
        END
        WHERE setting_group IS NULL;
        
        RAISE NOTICE 'Added setting_group column to system_settings table';
    ELSE
        RAISE NOTICE 'setting_group column already exists in system_settings table';
    END IF;
END $$;


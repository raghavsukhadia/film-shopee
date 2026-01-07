-- Migration: Create vehicle_inward_comments table
-- This table stores comments for vehicle inward entries

-- Create vehicle_inward_comments table
CREATE TABLE IF NOT EXISTS vehicle_inward_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User name or email
    role VARCHAR(50) NOT NULL, -- User role (admin, manager, coordinator, installer, accountant)
    attachments_count INTEGER DEFAULT 0, -- Count of attachments for this comment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_comments_vehicle_inward_id 
ON vehicle_inward_comments(vehicle_inward_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inward_comments_tenant_id 
ON vehicle_inward_comments(tenant_id);

-- Update vehicle_inward_comment_attachments to reference comment_id instead of vehicle_inward_id
-- First check if comment_id column exists
DO $$ 
BEGIN
    -- Add comment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_inward_comment_attachments' 
        AND column_name = 'comment_id'
    ) THEN
        -- Add comment_id column
        ALTER TABLE vehicle_inward_comment_attachments 
        ADD COLUMN comment_id UUID REFERENCES vehicle_inward_comments(id) ON DELETE CASCADE;
        
        -- Keep vehicle_inward_id for backward compatibility, but comment_id is the primary reference
        COMMENT ON COLUMN vehicle_inward_comment_attachments.comment_id IS 'Reference to the comment this attachment belongs to';
    END IF;
END $$;

-- Update file_url column name to match code expectations (if file_path exists, rename it)
DO $$ 
BEGIN
    -- Check if file_path exists and file_url doesn't
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_inward_comment_attachments' 
        AND column_name = 'file_path'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_inward_comment_attachments' 
        AND column_name = 'file_url'
    ) THEN
        -- Rename file_path to file_url to match code
        ALTER TABLE vehicle_inward_comment_attachments 
        RENAME COLUMN file_path TO file_url;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE vehicle_inward_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view vehicle_inward_comments in their tenant" ON vehicle_inward_comments;
DROP POLICY IF EXISTS "Users can manage vehicle_inward_comments in their tenant" ON vehicle_inward_comments;

-- Users can view vehicle_inward_comments in their tenant
CREATE POLICY "Users can view vehicle_inward_comments in their tenant"
    ON vehicle_inward_comments FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage vehicle_inward_comments in their tenant
CREATE POLICY "Users can manage vehicle_inward_comments in their tenant"
    ON vehicle_inward_comments FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Update RLS policies for vehicle_inward_comment_attachments to include comment_id
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view vehicle_inward_comment_attachments in their tenant" ON vehicle_inward_comment_attachments;
DROP POLICY IF EXISTS "Users can manage vehicle_inward_comment_attachments in their tenant" ON vehicle_inward_comment_attachments;

-- Users can view vehicle_inward_comment_attachments in their tenant
-- Access through vehicle_inward_id or comment_id
CREATE POLICY "Users can view vehicle_inward_comment_attachments in their tenant"
    ON vehicle_inward_comment_attachments FOR SELECT
    USING (
        vehicle_inward_id IN (
            SELECT id FROM vehicle_inward 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid()
            )
        )
        OR comment_id IN (
            SELECT id FROM vehicle_inward_comments 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid()
            )
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage vehicle_inward_comment_attachments in their tenant
CREATE POLICY "Users can manage vehicle_inward_comment_attachments in their tenant"
    ON vehicle_inward_comment_attachments FOR ALL
    USING (
        vehicle_inward_id IN (
            SELECT id FROM vehicle_inward 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid()
            )
        )
        OR comment_id IN (
            SELECT id FROM vehicle_inward_comments 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid()
            )
        )
        OR is_super_admin(auth.uid())
    );

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'vehicle_inward_comments'
ORDER BY ordinal_position;


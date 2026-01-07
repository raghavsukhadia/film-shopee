-- Migration: Create service_tracker_comments and service_tracker_comment_attachments tables
-- These tables are required for the Service Tracker comments feature

-- =====================================================
-- Create service_tracker_comments table
-- =====================================================
CREATE TABLE IF NOT EXISTS service_tracker_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    service_tracker_id UUID REFERENCES service_trackers(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User name or email
    attachments_count INTEGER DEFAULT 0, -- Count of attachments for this comment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_tracker_comments_service_tracker_id 
ON service_tracker_comments(service_tracker_id);

CREATE INDEX IF NOT EXISTS idx_service_tracker_comments_tenant_id 
ON service_tracker_comments(tenant_id);

-- =====================================================
-- Create service_tracker_comment_attachments table
-- =====================================================
CREATE TABLE IF NOT EXISTS service_tracker_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES service_tracker_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_tracker_comment_attachments_comment_id 
ON service_tracker_comment_attachments(comment_id);

CREATE INDEX IF NOT EXISTS idx_service_tracker_comment_attachments_tenant_id 
ON service_tracker_comment_attachments(tenant_id);

-- =====================================================
-- Enable RLS on both tables
-- =====================================================
ALTER TABLE service_tracker_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tracker_comment_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for service_tracker_comments
-- =====================================================
-- SELECT Policy: Allow authenticated users to view comments
CREATE POLICY "policy_service_tracker_comments_select_all"
ON service_tracker_comments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert comments
CREATE POLICY "policy_service_tracker_comments_insert_all"
ON service_tracker_comments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update comments
CREATE POLICY "policy_service_tracker_comments_update_all"
ON service_tracker_comments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete comments
CREATE POLICY "policy_service_tracker_comments_delete_all"
ON service_tracker_comments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- RLS Policies for service_tracker_comment_attachments
-- =====================================================
-- SELECT Policy: Allow authenticated users to view comment attachments
CREATE POLICY "policy_service_tracker_comment_attachments_select_all"
ON service_tracker_comment_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert comment attachments
CREATE POLICY "policy_service_tracker_comment_attachments_insert_all"
ON service_tracker_comment_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update comment attachments
CREATE POLICY "policy_service_tracker_comment_attachments_update_all"
ON service_tracker_comment_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete comment attachments
CREATE POLICY "policy_service_tracker_comment_attachments_delete_all"
ON service_tracker_comment_attachments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Verify tables were created
-- =====================================================
SELECT 
  'service_tracker_comments' AS table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_tracker_comments'
  ) AS table_exists,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_comments'
UNION ALL
SELECT 
  'service_tracker_comment_attachments' AS table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_tracker_comment_attachments'
  ) AS table_exists,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'service_tracker_comment_attachments';


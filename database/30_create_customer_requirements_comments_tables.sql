-- Migration: Create customer_requirements_comments and customer_requirements_comment_attachments tables
-- These tables are required for the Customer Requirements comments feature

-- =====================================================
-- Create customer_requirements_comments table
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_requirements_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES customer_requirements(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User name or email
    attachments_count INTEGER DEFAULT 0, -- Count of attachments for this comment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_requirements_comments_requirement_id 
ON customer_requirements_comments(requirement_id);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_comments_tenant_id 
ON customer_requirements_comments(tenant_id);

-- =====================================================
-- Create customer_requirements_comment_attachments table
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_requirements_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES customer_requirements_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_requirements_comment_attachments_comment_id 
ON customer_requirements_comment_attachments(comment_id);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_comment_attachments_tenant_id 
ON customer_requirements_comment_attachments(tenant_id);

-- =====================================================
-- Enable RLS on both tables
-- =====================================================
ALTER TABLE customer_requirements_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_requirements_comment_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for customer_requirements_comments
-- =====================================================
-- SELECT Policy: Allow authenticated users to view comments
CREATE POLICY "policy_customer_requirements_comments_select_all"
ON customer_requirements_comments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert comments
CREATE POLICY "policy_customer_requirements_comments_insert_all"
ON customer_requirements_comments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update comments
CREATE POLICY "policy_customer_requirements_comments_update_all"
ON customer_requirements_comments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete comments
CREATE POLICY "policy_customer_requirements_comments_delete_all"
ON customer_requirements_comments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- RLS Policies for customer_requirements_comment_attachments
-- =====================================================
-- SELECT Policy: Allow authenticated users to view comment attachments
CREATE POLICY "policy_customer_requirements_comment_attachments_select_all"
ON customer_requirements_comment_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert comment attachments
CREATE POLICY "policy_customer_requirements_comment_attachments_insert_all"
ON customer_requirements_comment_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update comment attachments
CREATE POLICY "policy_customer_requirements_comment_attachments_update_all"
ON customer_requirements_comment_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete comment attachments
CREATE POLICY "policy_customer_requirements_comment_attachments_delete_all"
ON customer_requirements_comment_attachments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Verify tables were created
-- =====================================================
SELECT 
  'customer_requirements_comments' AS table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_requirements_comments'
  ) AS table_exists,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customer_requirements_comments'
UNION ALL
SELECT 
  'customer_requirements_comment_attachments' AS table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_requirements_comment_attachments'
  ) AS table_exists,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customer_requirements_comment_attachments';


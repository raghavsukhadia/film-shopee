-- Migration: Setup storage bucket and table for customer requirements attachments
-- This script creates the storage bucket and table required for customer requirements file uploads

-- =====================================================
-- Create storage bucket for customer requirements attachments
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-attachments',
  'service-attachments',
  true, -- Set to false if you want a private bucket (requires RLS policies)
  52428800, -- 50MB limit (50 * 1024 * 1024 bytes) - larger for videos
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ];

-- =====================================================
-- Create customer_requirements_attachments table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_requirements_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES customer_requirements(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_requirements_attachments_requirement_id
ON customer_requirements_attachments(requirement_id);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_attachments_tenant_id
ON customer_requirements_attachments(tenant_id);

-- =====================================================
-- Enable RLS on the table
-- =====================================================
ALTER TABLE customer_requirements_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for customer_requirements_attachments table
-- =====================================================
-- SELECT Policy: Allow authenticated users to view attachments
CREATE POLICY "policy_customer_requirements_attachments_select_all"
ON customer_requirements_attachments FOR SELECT
TO authenticated
USING (true);

-- INSERT Policy: Allow authenticated users to insert attachments
CREATE POLICY "policy_customer_requirements_attachments_insert_all"
ON customer_requirements_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update attachments
CREATE POLICY "policy_customer_requirements_attachments_update_all"
ON customer_requirements_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete attachments
CREATE POLICY "policy_customer_requirements_attachments_delete_all"
ON customer_requirements_attachments FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Storage Bucket RLS Policies
-- =====================================================
-- Drop existing policies for service-attachments bucket if any
DROP POLICY IF EXISTS "Allow authenticated uploads to service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from service-attachments" ON storage.objects;

-- Create permissive storage policies for service-attachments bucket
CREATE POLICY "Allow authenticated uploads to service-attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-attachments'
);

CREATE POLICY "Allow authenticated reads from service-attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-attachments'
);

CREATE POLICY "Allow authenticated updates to service-attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-attachments'
)
WITH CHECK (
  bucket_id = 'service-attachments'
);

CREATE POLICY "Allow authenticated deletes from service-attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-attachments'
);

-- =====================================================
-- Add attachments_count column to customer_requirements if it doesn't exist
-- =====================================================
ALTER TABLE customer_requirements
ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;

-- =====================================================
-- Verify setup
-- =====================================================
-- Check bucket exists
SELECT 
  'Bucket exists' AS check_type,
  EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'service-attachments'
  ) AS result
UNION ALL
-- Check table exists
SELECT 
  'Table exists' AS check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_requirements_attachments'
  ) AS result
UNION ALL
-- Check RLS enabled
SELECT 
  'RLS enabled' AS check_type,
  rowsecurity AS result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customer_requirements_attachments'
UNION ALL
-- Check policies exist
SELECT 
  'Policies exist' AS check_type,
  (COUNT(*) > 0)::boolean AS result
FROM pg_policies
WHERE tablename = 'customer_requirements_attachments';


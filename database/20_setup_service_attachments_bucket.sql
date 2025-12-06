-- =====================================================
-- Storage Bucket Setup for Service Tracker Attachments
-- =====================================================
-- This script creates the storage bucket for service tracker attachments
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Create the storage bucket for service attachments (or update if exists)
-- Note: If bucket already exists with name 'service_tracker_attachments', this will update it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service_tracker_attachments',
  'service_tracker_attachments',
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
-- Create service_tracker_attachments table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS service_tracker_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_tracker_id UUID REFERENCES service_trackers(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tenant_id for data isolation
ALTER TABLE service_tracker_attachments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_tracker_attachments_service_id 
ON service_tracker_attachments(service_tracker_id);

CREATE INDEX IF NOT EXISTS idx_service_tracker_attachments_tenant_id 
ON service_tracker_attachments(tenant_id);

-- Enable RLS
ALTER TABLE service_tracker_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view attachments in their tenant
-- Drop policy if exists, then create
DROP POLICY IF EXISTS "Users can view service attachments in their tenant" ON service_tracker_attachments;
CREATE POLICY "Users can view service attachments in their tenant"
ON service_tracker_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.tenant_id = service_tracker_attachments.tenant_id
  )
  OR EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert attachments in their tenant
-- Very permissive policy: Allow all authenticated users (for now, can be tightened later)
DROP POLICY IF EXISTS "Users can insert service attachments in their tenant" ON service_tracker_attachments;
CREATE POLICY "Users can insert service attachments in their tenant"
ON service_tracker_attachments FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow all authenticated users to insert

-- RLS Policy: Users can delete attachments in their tenant
DROP POLICY IF EXISTS "Users can delete service attachments in their tenant" ON service_tracker_attachments;
CREATE POLICY "Users can delete service attachments in their tenant"
ON service_tracker_attachments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.tenant_id = service_tracker_attachments.tenant_id
  )
  OR EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the bucket was created successfully
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'service_tracker_attachments';


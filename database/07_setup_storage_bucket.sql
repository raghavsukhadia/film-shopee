-- =====================================================
-- Storage Bucket Setup for Payment Proofs
-- =====================================================
-- This script creates the storage bucket for payment proofs
-- Execute this in Supabase SQL Editor after setting up the database
-- =====================================================

-- Create the storage bucket
-- Note: This requires the storage extension to be enabled
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true, -- Set to false if you want a private bucket (requires RLS policies)
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- =====================================================
-- RLS Policies for Storage (Only needed if bucket is PRIVATE)
-- =====================================================
-- Uncomment the following if you set public = false above

/*
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow tenant admins to upload payment proofs
CREATE POLICY "Tenant admins can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 2: Allow tenant admins to view their tenant's payment proofs
CREATE POLICY "Tenant admins can view their tenant's payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.role = 'admin'
    AND (storage.foldername(name))[1] = tu.tenant_id::text
  )
);

-- Policy 3: Allow super admins full access to all payment proofs
CREATE POLICY "Super admins can manage all payment proofs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);

-- Policy 4: Allow super admins to insert/update/delete
CREATE POLICY "Super admins can insert payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);
*/

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
WHERE id = 'payment-proofs';


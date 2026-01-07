-- =====================================================
-- Fix tenant_payment_proofs Table Schema
-- =====================================================
-- This script updates the tenant_payment_proofs table
-- to match what the application code expects
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Add missing columns to tenant_payment_proofs table
ALTER TABLE tenant_payment_proofs
ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make payment_proof_url NOT NULL if it doesn't have data
-- First, update existing rows to use file_path as payment_proof_url
UPDATE tenant_payment_proofs
SET payment_proof_url = file_path
WHERE payment_proof_url IS NULL AND file_path IS NOT NULL;

-- Now make it NOT NULL (only if all rows have values)
-- If you have existing NULL values, you'll need to handle them first
-- ALTER TABLE tenant_payment_proofs ALTER COLUMN payment_proof_url SET NOT NULL;

-- Update file_path to be optional (it's kept for backward compatibility)
ALTER TABLE tenant_payment_proofs
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_name DROP NOT NULL;

-- Rename uploaded_by to admin_user_id if it exists and admin_user_id doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_payment_proofs' 
        AND column_name = 'uploaded_by'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_payment_proofs' 
        AND column_name = 'admin_user_id'
    ) THEN
        ALTER TABLE tenant_payment_proofs RENAME COLUMN uploaded_by TO admin_user_id;
    END IF;
END $$;

-- =====================================================
-- Add RLS Policies for tenant_payment_proofs
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tenant admins can view their payment proofs" ON tenant_payment_proofs;
DROP POLICY IF EXISTS "Tenant admins can insert payment proofs" ON tenant_payment_proofs;
DROP POLICY IF EXISTS "Super admins can manage all payment proofs" ON tenant_payment_proofs;

-- Policy 1: Tenant admins can view their tenant's payment proofs
CREATE POLICY "Tenant admins can view their payment proofs"
    ON tenant_payment_proofs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Policy 2: Tenant admins can insert payment proofs for their tenant
CREATE POLICY "Tenant admins can insert payment proofs"
    ON tenant_payment_proofs FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policy 3: Super admins can manage all payment proofs
CREATE POLICY "Super admins can manage all payment proofs"
    ON tenant_payment_proofs FOR ALL
    USING (is_super_admin(auth.uid()));

-- Policy 4: Super admins can update payment proofs (for review/approval)
CREATE POLICY "Super admins can update payment proofs"
    ON tenant_payment_proofs FOR UPDATE
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenant_payment_proofs'
ORDER BY ordinal_position;


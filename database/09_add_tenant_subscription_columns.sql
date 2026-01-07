-- =====================================================
-- Add Subscription Columns to Tenants Table
-- =====================================================
-- This script adds missing subscription-related columns
-- to the tenants table that are used by the application
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Add subscription_status column
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- Add trial_ends_at column
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add is_free column (for free tier tenants)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Update existing tenants to have default values
UPDATE tenants
SET 
  subscription_status = COALESCE(subscription_status, 'trial'),
  is_free = COALESCE(is_free, false)
WHERE subscription_status IS NULL OR is_free IS NULL;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the columns were added successfully
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('subscription_status', 'trial_ends_at', 'is_free')
ORDER BY column_name;


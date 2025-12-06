-- Migration: Add missing columns to service_trackers table
-- This migration adds the columns required by the Service Tracker form

-- Add modal_name column (vehicle model name)
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS modal_name VARCHAR(255);

-- Add registration_number column
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);

-- Add customer_name column
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Add customer_number column
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50);

-- Add service_description column
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS service_description TEXT;

-- Add scheduled_date column
ALTER TABLE service_trackers 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- Make checkpoint_name nullable since it may not always be required for service jobs
DO $$
BEGIN
    -- Check if checkpoint_name has NOT NULL constraint and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_trackers' 
        AND column_name = 'checkpoint_name' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE service_trackers ALTER COLUMN checkpoint_name DROP NOT NULL;
    END IF;
END $$;


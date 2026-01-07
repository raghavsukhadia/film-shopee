-- Migration: Add service_center column to service_trackers table
-- This migration adds the service_center field to store the name of the service center

-- Add service_center column
ALTER TABLE service_trackers
ADD COLUMN IF NOT EXISTS service_center VARCHAR(255);

-- Verify column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'service_trackers'
AND column_name = 'service_center';


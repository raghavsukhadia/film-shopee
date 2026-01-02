-- Migration: Add missing columns to customer_requirements table
-- This migration adds the columns required by the Customer Requirements form

-- Add customer_name column
ALTER TABLE customer_requirements
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Add customer_number column
ALTER TABLE customer_requirements
ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50);

-- Add description column (the form uses 'description' but table has 'requirement')
-- We'll add description and keep requirement for backward compatibility
ALTER TABLE customer_requirements
ADD COLUMN IF NOT EXISTS description TEXT;

-- If description is empty but requirement has data, copy it
-- This is a one-time data migration
UPDATE customer_requirements
SET description = requirement
WHERE (description IS NULL OR description = '') 
AND requirement IS NOT NULL 
AND requirement != '';

-- Make requirement nullable since we're using description now
DO $$
BEGIN
    -- Check if requirement has NOT NULL constraint and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_requirements'
        AND column_name = 'requirement'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE customer_requirements ALTER COLUMN requirement DROP NOT NULL;
    END IF;
END $$;

-- Verify columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_requirements'
AND column_name IN ('customer_name', 'customer_number', 'description', 'requirement')
ORDER BY column_name;


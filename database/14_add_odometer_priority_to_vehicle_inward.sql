-- Migration: Add odometer_reading and priority columns to vehicle_inward table
-- This migration adds the missing columns that are used in the vehicle inward form

-- Add odometer_reading column (INTEGER, nullable)
-- This stores the vehicle's odometer reading at the time of intake
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_inward' 
        AND column_name = 'odometer_reading'
    ) THEN
        ALTER TABLE vehicle_inward 
        ADD COLUMN odometer_reading INTEGER;
        
        COMMENT ON COLUMN vehicle_inward.odometer_reading IS 'Vehicle odometer reading at the time of intake';
    END IF;
END $$;

-- Add priority column (VARCHAR(50), default 'medium')
-- This stores the priority level of the vehicle intake (low, medium, high, urgent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_inward' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE vehicle_inward 
        ADD COLUMN priority VARCHAR(50) DEFAULT 'medium';
        
        COMMENT ON COLUMN vehicle_inward.priority IS 'Priority level of the vehicle intake (low, medium, high, urgent)';
    END IF;
END $$;

-- Update existing records to have default priority if null
UPDATE vehicle_inward 
SET priority = 'medium' 
WHERE priority IS NULL;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'vehicle_inward' 
AND column_name IN ('odometer_reading', 'priority')
ORDER BY column_name;


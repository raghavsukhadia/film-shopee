-- Migration: Add missing columns to call_follow_up table
-- This migration adds the columns required by the Call Follow Up form

-- Add caller_name column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS caller_name VARCHAR(255);

-- Add caller_number column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS caller_number VARCHAR(50);

-- Add person_to_contact column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS person_to_contact VARCHAR(255);

-- Add operator column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS operator VARCHAR(255);

-- Add assigned_to column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);

-- Add priority column
ALTER TABLE call_follow_up 
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';

-- Make subject and next_call_date nullable since the form may not always require them
-- Check if columns are NOT NULL before attempting to alter
DO $$
BEGIN
    -- Check if subject has NOT NULL constraint and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_follow_up' 
        AND column_name = 'subject' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE call_follow_up ALTER COLUMN subject DROP NOT NULL;
    END IF;
    
    -- Check if next_call_date has NOT NULL constraint and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_follow_up' 
        AND column_name = 'next_call_date' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE call_follow_up ALTER COLUMN next_call_date DROP NOT NULL;
    END IF;
END $$;


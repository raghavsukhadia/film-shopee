-- =====================================================
-- Database Functions and Views
-- =====================================================
-- This file contains useful functions and views
-- Execute this file after 03_initial_data.sql
-- =====================================================

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Monthly Revenue View
CREATE OR REPLACE VIEW v_revenue_monthly AS
SELECT 
    tenant_id,
    DATE_TRUNC('month', paid_date) AS month,
    COUNT(*) AS invoice_count,
    SUM(total_amount) AS total_revenue,
    SUM(amount) AS base_amount,
    SUM(tax_amount) AS total_tax
FROM invoices
WHERE status = 'paid' AND paid_date IS NOT NULL
GROUP BY tenant_id, DATE_TRUNC('month', paid_date);

-- Vehicle Status Summary View
CREATE OR REPLACE VIEW v_vehicle_status_summary AS
SELECT 
    tenant_id,
    status,
    COUNT(*) AS vehicle_count
FROM vehicles
GROUP BY tenant_id, status;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate short ID for vehicle_inward
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS VARCHAR(50) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars
    result VARCHAR(50) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if this ID already exists
    WHILE EXISTS (SELECT 1 FROM vehicle_inward WHERE short_id = result) LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate short_id for vehicle_inward
CREATE OR REPLACE FUNCTION auto_generate_short_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
        NEW.short_id := generate_short_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate short_id
CREATE TRIGGER trigger_auto_generate_short_id
    BEFORE INSERT ON vehicle_inward
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_short_id();

-- =====================================================
-- END OF FUNCTIONS AND VIEWS
-- =====================================================


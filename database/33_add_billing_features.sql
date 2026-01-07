-- =====================================================
-- Billing Features Migration
-- Adds billing-specific fields and payment tracking
-- =====================================================

-- Add billing fields to vehicle_inward table
ALTER TABLE vehicle_inward
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_payable DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS billing_closed_at TIMESTAMPTZ;

-- Modify payments table to support billing entries
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Make invoice_id nullable for backward compatibility
ALTER TABLE payments
ALTER COLUMN invoice_id DROP NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_billing_status ON vehicle_inward(billing_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_due_date ON vehicle_inward(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_vehicle_inward_id ON payments(vehicle_inward_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Create function to calculate balance due for a billing entry
CREATE OR REPLACE FUNCTION calculate_billing_balance(entry_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  net_payable_amount DECIMAL(10, 2);
  total_paid_amount DECIMAL(10, 2);
BEGIN
  -- Get net payable from vehicle_inward
  SELECT COALESCE(net_payable, 0) INTO net_payable_amount
  FROM vehicle_inward
  WHERE id = entry_id;
  
  -- Get total payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid_amount
  FROM payments
  WHERE vehicle_inward_id = entry_id;
  
  RETURN net_payable_amount - total_paid_amount;
END;
$$ LANGUAGE plpgsql;

-- Create billing payment timeline view
CREATE OR REPLACE VIEW billing_payment_timeline AS
SELECT 
  vi.id as billing_entry_id,
  'entry_created' as event_type,
  vi.created_at as event_date,
  NULL::DECIMAL(10, 2) as amount,
  NULL::VARCHAR(50) as payment_method,
  NULL::VARCHAR(255) as reference_number,
  NULL::TEXT as notes
FROM vehicle_inward vi
UNION ALL
SELECT 
  vi.id as billing_entry_id,
  'invoice_linked' as event_type,
  COALESCE(vi.invoice_date, vi.updated_at) as event_date,
  NULL::DECIMAL(10, 2) as amount,
  NULL::VARCHAR(50) as payment_method,
  vi.invoice_number as reference_number,
  NULL::TEXT as notes
FROM vehicle_inward vi
WHERE vi.invoice_number IS NOT NULL
UNION ALL
SELECT 
  p.vehicle_inward_id as billing_entry_id,
  'payment' as event_type,
  p.payment_date::TIMESTAMPTZ as event_date,
  p.amount,
  p.payment_method,
  p.reference_number,
  p.notes
FROM payments p
WHERE p.vehicle_inward_id IS NOT NULL
UNION ALL
SELECT 
  vi.id as billing_entry_id,
  'entry_closed' as event_type,
  vi.billing_closed_at as event_date,
  NULL::DECIMAL(10, 2) as amount,
  NULL::VARCHAR(50) as payment_method,
  NULL::VARCHAR(255) as reference_number,
  NULL::TEXT as notes
FROM vehicle_inward vi
WHERE vi.billing_closed_at IS NOT NULL
ORDER BY billing_entry_id, event_date;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_inward.billing_status IS 'Billing status: draft, invoiced, or closed';
COMMENT ON COLUMN vehicle_inward.net_payable IS 'Net amount payable after discount and tax';
COMMENT ON COLUMN payments.vehicle_inward_id IS 'Link to billing entry (vehicle_inward)';
COMMENT ON FUNCTION calculate_billing_balance IS 'Calculates balance due for a billing entry';


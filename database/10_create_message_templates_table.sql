-- =====================================================
-- Create Message Templates Table
-- =====================================================
-- This script creates the message_templates table for
-- storing WhatsApp message templates
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Message Templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, event_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant_event 
ON message_templates(tenant_id, event_type);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for message_templates
-- =====================================================

-- Users can view message templates for their tenant
CREATE POLICY "Users can view message templates for their tenant"
    ON message_templates FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

-- Users can manage message templates for their tenant
CREATE POLICY "Users can manage message templates for their tenant"
    ON message_templates FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Super admins can manage all message templates
CREATE POLICY "Super admins can manage all message templates"
    ON message_templates FOR ALL
    USING (is_super_admin(auth.uid()));

-- =====================================================
-- Insert Default Templates (Platform-wide)
-- =====================================================
-- These are default templates that can be customized per tenant
-- tenant_id is NULL for platform-wide defaults

INSERT INTO message_templates (tenant_id, event_type, template)
VALUES
    (NULL, 'vehicle_inward_created', '🚗 *New Vehicle Entry*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nStatus: Pending\n\nPlease check the dashboard for details.'),
    (NULL, 'installation_complete', '✅ *Installation Complete*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nAll products have been installed successfully.\n\nReady for accountant review.'),
    (NULL, 'invoice_number_added', '📄 *Invoice Number Added*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice number has been set by accountant.\n\nPlease check the dashboard for details.'),
    (NULL, 'accountant_completed', '✓ *Accountant Completed*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice processing completed.\n\nReady for delivery.'),
    (NULL, 'vehicle_delivered', '🚚 *Vehicle Delivered*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nVehicle has been marked as delivered.\n\nThank you for your work!')
ON CONFLICT (tenant_id, event_type) DO NOTHING;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table was created successfully
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;


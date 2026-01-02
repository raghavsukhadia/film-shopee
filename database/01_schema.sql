-- =====================================================
-- Filmshoppee-Car (Zoravo OMS) - Complete Database Schema
-- =====================================================
-- This file contains all table definitions for the multi-tenant application
-- Execute this file first in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. MULTI-TENANT TABLES
-- =====================================================

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    workspace_url VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Users (junction table for users and tenants)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'coordinator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Super Admins table
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. USER MANAGEMENT
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'coordinator',
    department VARCHAR(100),
    departments TEXT[], -- Array of departments for multi-department access
    specialization VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. LOCATIONS & DEPARTMENTS (Created early for foreign key references)
-- =====================================================

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Types table
CREATE TABLE IF NOT EXISTS vehicle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. VEHICLE & CUSTOMER MANAGEMENT
-- =====================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    vehicle_type VARCHAR(100),
    last_service_date DATE,
    next_service_date DATE,
    warranty_expiry DATE,
    insurance_expiry DATE,
    total_services INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Inward table (main intake form)
CREATE TABLE IF NOT EXISTS vehicle_inward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    short_id VARCHAR(50) UNIQUE, -- Short identifier for easy reference
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    
    -- Vehicle Information
    registration_number VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    vehicle_type VARCHAR(100),
    odometer_reading INTEGER, -- Vehicle odometer reading at intake
    
    -- Service Information
    issues_reported TEXT,
    accessories_requested TEXT, -- JSON array of products
    estimated_cost DECIMAL(10, 2),
    estimated_completion_date DATE,
    priority VARCHAR(50) DEFAULT 'medium', -- Priority level (low, medium, high, urgent)
    
    -- Assignment
    assigned_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_installer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT, -- JSON for additional data like invoice_number
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. WORK ORDERS & TRACKING
-- =====================================================

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Trackers table
CREATE TABLE IF NOT EXISTS service_trackers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    checkpoint_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Follow Up table
CREATE TABLE IF NOT EXISTS call_follow_up (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    next_call_date DATE NOT NULL,
    outcome TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Requirements table
CREATE TABLE IF NOT EXISTS customer_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    vehicle_name VARCHAR(255), -- Vehicle name/identifier
    requirement TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    estimated_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. FINANCIAL TABLES
-- =====================================================

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SUBSCRIPTION MANAGEMENT
-- =====================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    plan_display_name VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    billing_cycle VARCHAR(50) DEFAULT 'annual',
    status VARCHAR(50) DEFAULT 'trial',
    trial_start_date DATE,
    trial_end_date DATE,
    subscription_start_date DATE,
    subscription_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Plan Requests table
CREATE TABLE IF NOT EXISTS subscription_plan_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    plan_display_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    billing_cycle VARCHAR(50) DEFAULT 'annual',
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT
);

-- Tenant Payment Proofs table
CREATE TABLE IF NOT EXISTS tenant_payment_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payment_proof_url TEXT NOT NULL,
    file_path TEXT, -- Keep for backward compatibility
    file_name VARCHAR(255),
    file_size INTEGER,
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    payment_date DATE,
    transaction_id VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Approval Requests table
CREATE TABLE IF NOT EXISTS tenant_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT
);

-- =====================================================
-- 7. SYSTEM SETTINGS
-- =====================================================

-- System Settings table (key-value store)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for platform-wide settings
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

-- =====================================================
-- 8. NOTIFICATIONS
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    related_entity_type VARCHAR(50), -- 'vehicle', 'invoice', etc.
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, notification_type)
);

-- =====================================================
-- 9. COMMENTS & ATTACHMENTS
-- =====================================================

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Attachments table
CREATE TABLE IF NOT EXISTS comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Inward Comments table
CREATE TABLE IF NOT EXISTS vehicle_inward_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User name or email
    role VARCHAR(50) NOT NULL, -- User role (admin, manager, coordinator, installer, accountant)
    attachments_count INTEGER DEFAULT 0, -- Count of attachments for this comment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Inward Comment Attachments table
CREATE TABLE IF NOT EXISTS vehicle_inward_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES vehicle_inward_comments(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL, -- File URL or base64 data URL
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code ON tenants(tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenants_workspace_url ON tenants(workspace_url);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);

-- Vehicle indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_tenant_id ON vehicle_inward(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_status ON vehicle_inward(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_short_id ON vehicle_inward(short_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_comments_vehicle_inward_id ON vehicle_inward_comments(vehicle_inward_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_comments_tenant_id ON vehicle_inward_comments(tenant_id);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Work order indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_trackers_tenant_id ON service_trackers(tenant_id);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_id ON invoices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =====================================================
-- 12. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_inward_updated_at BEFORE UPDATE ON vehicle_inward FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_trackers_updated_at BEFORE UPDATE ON service_trackers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_follow_up_updated_at BEFORE UPDATE ON call_follow_up FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_requirements_updated_at BEFORE UPDATE ON customer_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_types_updated_at BEFORE UPDATE ON vehicle_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================


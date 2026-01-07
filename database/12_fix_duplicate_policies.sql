-- =====================================================
-- Fix Duplicate Policy Errors
-- =====================================================
-- Run this script if you get "policy already exists" errors
-- This will drop and recreate the policies that are causing issues
-- Execute this in Supabase SQL Editor
-- =====================================================
-- IMPORTANT: This script is safe to run multiple times
-- It drops existing policies before recreating them
-- =====================================================

-- Drop and recreate TENANTS policies
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Super admins can update tenants" ON tenants;

CREATE POLICY "Super admins can view all tenants"
    ON tenants FOR SELECT
    USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their tenant"
    ON tenants FOR SELECT
    USING (
        id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update tenants"
    ON tenants FOR UPDATE
    USING (is_super_admin(auth.uid()));

-- Drop and recreate TENANT_USERS policies
DROP POLICY IF EXISTS "Users can view tenant_users for their tenant" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can manage tenant_users" ON tenant_users;

CREATE POLICY "Users can view tenant_users for their tenant"
    ON tenant_users FOR SELECT
    USING (
        tenant_id = get_user_tenant_id(auth.uid())
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage tenant_users"
    ON tenant_users FOR ALL
    USING (is_super_admin(auth.uid()));

-- Drop and recreate SUPER_ADMINS policies
DROP POLICY IF EXISTS "Users can check if they are super admin" ON super_admins;
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;

CREATE POLICY "Users can check if they are super admin"
    ON super_admins FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all super admins"
    ON super_admins FOR SELECT
    USING (is_super_admin(auth.uid()));

-- Drop and recreate MESSAGE_TEMPLATES policies
DROP POLICY IF EXISTS "Users can view message templates for their tenant" ON message_templates;
DROP POLICY IF EXISTS "Users can manage message templates for their tenant" ON message_templates;
DROP POLICY IF EXISTS "Super admins can manage all message templates" ON message_templates;

CREATE POLICY "Users can view message templates for their tenant"
    ON message_templates FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR tenant_id IS NULL -- Platform-wide defaults
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Users can manage message templates for their tenant"
    ON message_templates FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can manage all message templates"
    ON message_templates FOR ALL
    USING (is_super_admin(auth.uid()));

-- Drop and recreate TENANT_PAYMENT_PROOFS policies
DROP POLICY IF EXISTS "Tenant admins can view their payment proofs" ON tenant_payment_proofs;
DROP POLICY IF EXISTS "Tenant admins can insert payment proofs" ON tenant_payment_proofs;
DROP POLICY IF EXISTS "Super admins can manage all payment proofs" ON tenant_payment_proofs;

CREATE POLICY "Tenant admins can view their payment proofs"
    ON tenant_payment_proofs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Tenant admins can insert payment proofs"
    ON tenant_payment_proofs FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Super admins can manage all payment proofs"
    ON tenant_payment_proofs FOR ALL
    USING (is_super_admin(auth.uid()));


# Role-Based Access Control (RBAC) Guide

## Overview

This document explains the role-based access control system in Filmshoppee-Car (Zoravo OMS) and what features are visible/hidden for each user role.

## User Roles

### 1. **Admin** (Tenant Admin)
- **Full Access**: Can access all features and manage everything in their tenant
- **Navigation Items**: All items visible
- **Dashboard**: Full dashboard with all KPIs, revenue, charts
- **Vehicle Inward**: Create, edit, delete
- **Vehicle Management**: Full access (view, edit, delete, update status)
- **Trackers**: Full access
- **Accounts**: Full access (Invoices, Reports)
- **Settings**: All tabs (Profile, Company, Management, Notifications, Payment)

### 2. **Manager**
- **High Access**: Can manage operations and view financial data
- **Navigation Items**: Dashboard, Vehicle Inward, Vehicle Management, Trackers, Accounts, Settings, About
- **Dashboard**: Full dashboard with financial charts (no revenue KPIs)
- **Vehicle Inward**: Create, edit
- **Vehicle Management**: View, edit (cannot delete delivered vehicles)
- **Trackers**: Full access
- **Accounts**: Full access (Invoices, Reports)
- **Settings**: Profile, Company, Management, Notifications (no Payment tab)

### 3. **Coordinator**
- **Moderate Access**: Can coordinate workflows and track progress
- **Navigation Items**: Dashboard, Vehicle Inward, Vehicle Management, Trackers, Settings, About
- **Dashboard**: Basic dashboard (no revenue, no financial charts)
- **Vehicle Inward**: Create, edit
- **Vehicle Management**: View, edit (cannot delete delivered vehicles)
- **Trackers**: Full access
- **Accounts**: ❌ No access
- **Settings**: Profile, Company only

### 4. **Installer**
- **Limited Access**: Can view assigned work and update status
- **Navigation Items**: Dashboard, Vehicle Management, Settings, About
- **Dashboard**: Installer-focused view (Recent Vehicles only, full-screen mode)
- **Vehicle Inward**: ❌ Cannot create new (can edit assigned vehicles)
- **Vehicle Management**: View only (can update status for assigned vehicles)
- **Trackers**: ❌ No access
- **Accounts**: ❌ No access
- **Settings**: Profile, Company only

### 5. **Accountant**
- **Financial Access**: Can manage invoices and view reports
- **Navigation Items**: Dashboard, Vehicle Management, Accounts, Settings, About
- **Dashboard**: Financial-focused view (Recent Invoices, revenue KPIs)
- **Vehicle Inward**: ❌ No access
- **Vehicle Management**: View only (can add invoice numbers)
- **Trackers**: ❌ No access
- **Accounts**: Full access (Invoices, Reports)
- **Settings**: Profile, Company only

## Feature Visibility Matrix

| Feature | Admin | Manager | Coordinator | Installer | Accountant |
|---------|-------|---------|-------------|-----------|------------|
| **Dashboard** | ✅ Full | ✅ Full (no revenue) | ✅ Basic | ✅ Installer View | ✅ Financial View |
| **Vehicle Inward - Create** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Vehicle Inward - Edit** | ✅ | ✅ | ✅ | ✅ (assigned only) | ❌ |
| **Vehicle Management - View** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Vehicle Management - Edit** | ✅ | ✅ | ✅ | ✅ (status only) | ❌ |
| **Vehicle Management - Delete** | ✅ | ✅ | ❌ (delivered) | ❌ | ❌ |
| **Trackers** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Accounts - Invoices** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Accounts - Reports** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Settings - Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Settings - Company** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Settings - Management** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings - Notifications** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings - Payment** | ✅ | ❌ | ❌ | ❌ | ❌ |

## Navigation Items by Role

### Admin
- Dashboard
- Vehicle Inward
- Vehicle Management
- Trackers
- Accounts (Invoices, Reports)
- Settings
- About

### Manager
- Dashboard
- Vehicle Inward
- Vehicle Management
- Trackers
- Accounts (Invoices, Reports)
- Settings
- About

### Coordinator
- Dashboard
- Vehicle Inward
- Vehicle Management
- Trackers
- Settings
- About

### Installer
- Dashboard
- Vehicle Management
- Settings
- About

### Accountant
- Dashboard
- Vehicle Management
- Accounts (Invoices, Reports)
- Settings
- About

## Dashboard Views by Role

### Admin Dashboard
- All KPIs (vehicles, revenue, pending amounts)
- Revenue charts and financial data
- Recent Vehicles tab
- Recent Invoices tab
- Overview tab with all metrics

### Manager Dashboard
- KPIs (vehicles, no revenue)
- Financial charts (no revenue KPIs)
- Recent Vehicles tab
- Recent Invoices tab

### Coordinator Dashboard
- Basic KPIs (vehicles only)
- Recent Vehicles tab
- No financial data

### Installer Dashboard
- Recent Vehicles tab only
- Full-screen mode for vehicle cards
- Keyboard navigation (Arrow keys, Escape)
- Focus on pending/in-progress vehicles

### Accountant Dashboard
- Revenue KPIs
- Financial charts
- Recent Invoices tab
- No vehicle management features

## Important Notes

1. **Role Detection**: User roles are determined from the `tenant_users` table, not the `profiles` table. This ensures tenant-specific roles are correctly applied.

2. **Super Admin**: Super admins have admin-level access across all tenants and can access the `/admin` routes.

3. **Subscription Status**: When subscription is expired, only Settings and About are visible (except for admins who always have full access).

4. **Tenant Isolation**: All data is filtered by `tenant_id` to ensure users only see data from their tenant.

5. **Z01 Tenant**: The first tenant (Z01/FS01) admin has special privileges similar to super admin for platform management.

## Troubleshooting

### Issue: User sees wrong navigation items
**Solution**: Check that the user's role in `tenant_users` table matches their expected role. The role in `profiles` table is not used for tenant users.

### Issue: Features are hidden when they shouldn't be
**Solution**: 
1. Verify user role in `tenant_users` table
2. Check subscription status (admins bypass subscription restrictions)
3. Verify RLS policies allow access

### Issue: User can't access a route
**Solution**: Check `ROUTE_PERMISSIONS` in `lib/rbac.ts` to ensure the role has access to that route.


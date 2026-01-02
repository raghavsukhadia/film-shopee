/**
 * React Query Key Factory
 * 
 * Centralized query key management for consistent caching and invalidation.
 */

export const queryKeys = {
  // Vehicles
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.vehicles.lists(), filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
  },

  // Vehicle Inward
  vehicleInward: {
    all: ['vehicle-inward'] as const,
    lists: () => [...queryKeys.vehicleInward.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.vehicleInward.lists(), filters] as const,
    details: () => [...queryKeys.vehicleInward.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicleInward.details(), id] as const,
  },

  // Accounts
  accounts: {
    all: ['accounts'] as const,
    entries: () => [...queryKeys.accounts.all, 'entries'] as const,
    entriesList: (filters: Record<string, any>) => [...queryKeys.accounts.entries(), filters] as const,
    invoices: () => [...queryKeys.accounts.all, 'invoices'] as const,
    invoicesList: (filters: Record<string, any>) => [...queryKeys.accounts.invoices(), filters] as const,
    reports: () => [...queryKeys.accounts.all, 'reports'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    kpis: () => [...queryKeys.dashboard.all, 'kpis'] as const,
    recentVehicles: (limit: number) => [...queryKeys.dashboard.all, 'recent-vehicles', limit] as const,
    recentInvoices: (limit: number) => [...queryKeys.dashboard.all, 'recent-invoices', limit] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    profile: () => [...queryKeys.settings.all, 'profile'] as const,
    company: () => [...queryKeys.settings.all, 'company'] as const,
    management: () => [...queryKeys.settings.all, 'management'] as const,
    notifications: () => [...queryKeys.settings.all, 'notifications'] as const,
    payment: () => [...queryKeys.settings.all, 'payment'] as const,
  },

  // Management Data (cached for longer)
  management: {
    all: ['management'] as const,
    locations: () => [...queryKeys.management.all, 'locations'] as const,
    vehicleTypes: () => [...queryKeys.management.all, 'vehicle-types'] as const,
    departments: () => [...queryKeys.management.all, 'departments'] as const,
    installers: () => [...queryKeys.management.all, 'installers'] as const,
    accountants: () => [...queryKeys.management.all, 'accountants'] as const,
    coordinators: () => [...queryKeys.management.all, 'coordinators'] as const,
    managers: () => [...queryKeys.management.all, 'managers'] as const,
  },

  // Trackers
  trackers: {
    all: ['trackers'] as const,
    serviceTracker: () => [...queryKeys.trackers.all, 'service-tracker'] as const,
    callFollowUp: () => [...queryKeys.trackers.all, 'call-follow-up'] as const,
  },

  // Tenant
  tenant: {
    all: ['tenant'] as const,
    current: () => [...queryKeys.tenant.all, 'current'] as const,
    users: () => [...queryKeys.tenant.all, 'users'] as const,
  },
}


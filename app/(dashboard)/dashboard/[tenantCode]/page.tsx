// Server component wrapper for tenant-specific dashboard route
export const dynamic = 'force-dynamic'

import DashboardPageClient from '../DashboardPageClient'

export default async function TenantDashboardPage({ params }: { params: Promise<{ tenantCode: string }> }) {
  const { tenantCode } = await params
  return <DashboardPageClient tenantCode={tenantCode} />
}


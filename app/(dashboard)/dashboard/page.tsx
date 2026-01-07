// Server component wrapper to export route segment config
// This route handles backward compatibility and redirects to tenant-specific routes
export const dynamic = 'force-dynamic'

import DashboardRedirectClient from './DashboardRedirectClient'

export default function DashboardPage() {
  return <DashboardRedirectClient />
}

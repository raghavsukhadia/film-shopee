# Project Structure

This document describes the professional file structure of the Film Shopee application.

## 📁 Directory Structure

```
film-shopee/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/             # Main application routes
│   │   ├── accounts/           # Accounts & billing
│   │   ├── admin/              # Admin panel
│   │   ├── dashboard/          # Dashboard
│   │   ├── inward/             # Vehicle inward
│   │   ├── settings/           # Settings
│   │   ├── trackers/           # Service trackers
│   │   └── vehicles/           # Vehicle management
│   └── api/                     # API routes
│       ├── admin/              # Admin APIs
│       ├── auth/               # Authentication APIs
│       ├── billing/            # Billing APIs
│       ├── users/              # User management APIs
│       └── ...
│
├── components/                   # React components
│   ├── accounts/               # Account-related components
│   ├── billing/                # Billing & payment components
│   ├── layout/                 # Layout components
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── SubscriptionGuard.tsx
│   ├── shared/                 # Shared/reusable components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── FormInput.tsx
│   │   ├── FormSelect.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── dashboard-charts.tsx
│   ├── settings/               # Settings components
│   ├── vehicles/               # Vehicle components
│   └── ui/                     # UI primitives (shadcn/ui)
│
├── docs/                        # Documentation
│   ├── deployment/             # Deployment guides
│   ├── setup/                  # Setup guides
│   ├── troubleshooting/        # Troubleshooting guides
│   └── features/               # Feature documentation
│
├── hooks/                       # Custom React hooks
│   ├── useAccountEntries.ts
│   ├── useBillingStats.ts
│   └── useFormAutoSave.ts
│
├── lib/                         # Library code
│   ├── helpers/                # Helper functions
│   │   ├── auth-error-handler.ts
│   │   ├── middleware-helpers.ts
│   │   ├── rbac.ts
│   │   ├── tenant-context.ts
│   │   └── workspace-detector.ts
│   ├── services/               # Service modules
│   │   ├── database-service.ts
│   │   ├── email-service.ts
│   │   ├── excel-export.ts
│   │   ├── notification-workflow.ts
│   │   ├── pdf-service.ts
│   │   └── whatsapp-service.ts
│   ├── supabase/               # Supabase configuration
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils/                  # Utility functions
│       ├── errors.ts
│       ├── formatting.ts
│       ├── logger.ts
│       ├── validation.ts
│       └── legacy.ts
│
├── types/                       # TypeScript type definitions
│   ├── billing.ts
│   ├── user.ts
│   └── vehicle.ts
│
├── database/                    # Database migration scripts
├── scripts/                     # Utility scripts
│   ├── setup/
│   ├── deployment/
│   └── maintenance/
└── public/                      # Static assets
```

## 🎯 Organization Principles

### Components
- **Feature-based**: Components are organized by feature/domain
- **Shared components**: Reusable components in `components/shared/`
- **Layout components**: Navigation and layout in `components/layout/`

### Library Code
- **Helpers**: Pure utility functions and helpers
- **Services**: Business logic and external service integrations
- **Utils**: General utility functions (logging, validation, formatting)

### Documentation
- **Deployment**: Guides for deploying the application
- **Setup**: Initial setup and configuration guides
- **Troubleshooting**: Common issues and solutions
- **Features**: User and feature documentation

## 📝 Import Paths

All imports use the `@/` alias configured in `tsconfig.json`:

```typescript
// Components
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import PaymentModal from '@/components/billing/PaymentModal'

// Helpers
import { getCurrentTenantId } from '@/lib/helpers/tenant-context'
import { checkUserRole } from '@/lib/helpers/rbac'

// Services
import { exportToExcel } from '@/lib/services/excel-export'
import { whatsappService } from '@/lib/services/whatsapp-service'

// Utils
import { logger } from '@/lib/utils/logger'
import { validateEmail } from '@/lib/utils/validation'

// Types
import type { AccountEntry } from '@/types/billing'
import type { User } from '@/types/user'
```

## 🔄 Migration Notes

If you're updating imports after this reorganization:

1. **Components**: Update paths from `@/components/ComponentName` to feature-specific paths
2. **Lib helpers**: Update from `@/lib/helper-name` to `@/lib/helpers/helper-name`
3. **Lib services**: Update from `@/lib/service-name` to `@/lib/services/service-name`
4. **Utils**: Update from `@/lib/utils` to `@/lib/utils/specific-util`


# Film Shopee - Car Accessories Management System

A comprehensive Order Management System (OMS) for car accessories businesses, built with Next.js 15, TypeScript, and Supabase.

## 📁 Project Structure

```
film-shopee/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main dashboard pages
│   ├── api/               # API routes
│   └── ...
├── components/            # React components
│   ├── accounts/         # Account-related components
│   ├── billing/          # Billing & payment components
│   ├── layout/           # Layout components (sidebar, topbar)
│   ├── shared/           # Shared/reusable components
│   ├── settings/         # Settings components
│   ├── vehicles/         # Vehicle-related components
│   └── ui/               # UI primitives (shadcn/ui)
├── docs/                  # Documentation
│   ├── deployment/       # Deployment guides
│   ├── setup/            # Setup guides
│   ├── troubleshooting/  # Troubleshooting guides
│   └── features/        # Feature documentation
├── hooks/                 # Custom React hooks
├── lib/                   # Library code
│   ├── helpers/          # Helper functions
│   ├── services/         # Service modules
│   ├── supabase/         # Supabase client configs
│   └── utils/            # Utility functions
├── types/                 # TypeScript type definitions
├── database/             # Database migration scripts
├── scripts/               # Utility scripts
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account and project
- Environment variables configured (see `env.example`)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## 📚 Documentation

- [User Manual](./docs/features/USER_MANUAL.md)
- [Deployment Guide](./docs/deployment/DEPLOYMENT_CHECKLIST.md)
- [Setup Guide](./docs/setup/QUICK_START.md)
- [Troubleshooting](./docs/troubleshooting/)

## 🏗️ Architecture

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React Hooks
- **Authentication**: Supabase Auth

## 📝 Key Features

- Multi-tenant architecture
- Role-based access control (RBAC)
- Vehicle management
- Billing & invoicing
- Payment tracking
- Service tracking
- WhatsApp notifications
- Excel export
- Real-time updates

## 🔧 Configuration

Copy `env.example` to `.env.local` and configure:

- Supabase URL and keys
- WhatsApp API credentials
- Email service configuration
- Other environment-specific settings

## 📄 License

Private - All rights reserved


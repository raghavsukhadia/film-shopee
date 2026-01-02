# Quick Start Guide - Filmshoppee-Car

Get your application up and running in minutes!

## Prerequisites Checklist

- [ ] Supabase project created
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git (optional, for cloning)

## 5-Minute Setup

### 1. Install Dependencies (1 minute)

```bash
npm install
# or
yarn install
```

### 2. Set Up Database (2 minutes)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open SQL Editor
3. Execute files in this order:
   - `database/01_schema.sql`
   - `database/02_rls_policies.sql`
   - `database/03_initial_data.sql`
   - `database/04_functions_and_views.sql`

See `Setup/DATABASE_SETUP_GUIDE.md` for detailed instructions.

### 3. Configure Environment (1 minute)

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
```

### 4. Create Super Admin (1 minute)

1. Create user in Supabase Dashboard > Authentication
2. Run this SQL (replace USER_ID):

```sql
INSERT INTO super_admins (user_id) VALUES ('USER_ID');
INSERT INTO profiles (id, email, name, role) 
VALUES ('USER_ID', 'admin@example.com', 'Admin', 'admin');
```

### 5. Start Application

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` and log in!

## What's Next?

- Create your first tenant
- Configure system settings
- Set up email (Resend API)
- Add your logo to `public/filmshoppee-logo.png`

## Need Help?

Check `Setup/DATABASE_SETUP_GUIDE.md` for detailed setup instructions.


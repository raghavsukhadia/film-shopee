# Vercel Redeployment Checklist

## ✅ Pre-Deployment Verification

### 1. Environment Variables
Ensure all required environment variables are set in Vercel Dashboard:

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (⚠️ Keep secret!)
- `NEXT_PUBLIC_APP_DOMAIN` - Your production domain (e.g., zoravo.in)
- `RESEND_API_KEY` - Resend API key (for email features)
- `RESEND_FROM_EMAIL` - From email address (e.g., noreply@zoravo.in)

**Optional but Recommended:**
- `NEXT_PUBLIC_SITE_URL` - Full site URL (e.g., https://www.zoravo.in) - Used for password reset links

### 2. Configuration Files
✅ `next.config.js` - Properly configured
✅ `vercel.json` - API function timeouts and cron jobs configured
✅ `package.json` - Dependencies up to date
✅ `.gitignore` - Environment files excluded

### 3. Code Quality
✅ No hardcoded localhost URLs in production code
✅ Environment variables used for all dynamic URLs
✅ Error handling in place
✅ TypeScript and ESLint errors handled (ignored in build config)

### 4. Recent Updates
✅ Session timeout handling implemented (1-hour timeout)
✅ Workspace name update functionality fixed
✅ About page updated with latest information
✅ Import paths fixed after code reorganization

## 🚀 Deployment Steps

### Step 1: Verify Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Verify all required variables are set for:
   - **Production**
   - **Preview**
   - **Development** (optional)

### Step 2: Clear Build Cache (Recommended)

1. Go to **Settings** → **General**
2. Scroll to **Build & Development Settings**
3. Click **Clear Build Cache**
4. This ensures a fresh build with latest changes

### Step 3: Deploy

**Option A: Automatic Deployment (Recommended)**
- Push changes to your main branch
- Vercel will automatically trigger a new deployment

**Option B: Manual Deployment**
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or use Vercel CLI: `vercel --prod`

### Step 4: Verify Deployment

After deployment completes:

1. **Check Build Logs**
   - Ensure build completed successfully
   - No critical errors in the logs

2. **Test Application**
   - Visit your production URL
   - Test login functionality
   - Verify session timeout works (1 hour)
   - Check About page displays correctly
   - Test workspace selection

3. **Check Function Logs**
   - Go to **Functions** tab in Vercel
   - Verify no runtime errors
   - Check API routes are responding

## 🔍 Post-Deployment Verification

### Critical Checks:
- [ ] Application loads without errors
- [ ] Login page accessible
- [ ] Authentication works correctly
- [ ] Session timeout redirects to login after 1 hour
- [ ] Workspace selection shows updated names
- [ ] About page displays correct information
- [ ] API routes respond correctly
- [ ] No console errors in browser

### Feature Checks:
- [ ] Dashboard loads correctly
- [ ] Vehicle management works
- [ ] Billing & accounts functional
- [ ] Settings page accessible
- [ ] User management works
- [ ] Email features work (if configured)

## 🐛 Troubleshooting

### Build Fails
- Check build logs for specific errors
- Verify Node.js version (should be 18+)
- Ensure all dependencies are in `package.json`
- Clear build cache and retry

### Runtime Errors
- Check Function logs in Vercel dashboard
- Verify environment variables are set correctly
- Check Supabase connection
- Verify database migrations are applied

### Session Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase auth settings
- Ensure session timeout is configured in Supabase dashboard

### Environment Variable Issues
- Double-check variable names (case-sensitive)
- Ensure `NEXT_PUBLIC_*` variables are set for all environments
- Verify no typos in variable values

## 📝 Notes

- The application uses Next.js 15 with App Router
- TypeScript and ESLint errors are ignored during build (configured in `next.config.js`)
- API routes have 30-second timeout (configured in `vercel.json`)
- Cron jobs are configured for daily reports and subscription checks
- Session timeout is set to 1 hour (configured in Supabase)

## 🔗 Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://app.supabase.com)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

---

**Last Updated:** January 2025
**Status:** ✅ Ready for Deployment


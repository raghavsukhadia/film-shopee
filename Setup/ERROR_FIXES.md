# Error Fixes Summary

## Issues Fixed

### 1. ✅ Infinite Recursion in RLS Policy for `tenant_users`

**Error:**
```
infinite recursion detected in policy for relation "tenant_users"
```

**Root Cause:**
The RLS policy for `tenant_users` was trying to SELECT from `tenant_users` itself to check permissions, creating a circular dependency.

**Fix Applied:**
Updated `database/02_rls_policies.sql` to use the `get_user_tenant_id()` function (which is `SECURITY DEFINER` and bypasses RLS) instead of directly querying `tenant_users`.

**Before:**
```sql
CREATE POLICY "Users can view tenant_users for their tenant"
    ON tenant_users FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
        OR is_super_admin(auth.uid())
    );
```

**After:**
```sql
CREATE POLICY "Users can view tenant_users for their tenant"
    ON tenant_users FOR SELECT
    USING (
        tenant_id = get_user_tenant_id(auth.uid())
        OR is_super_admin(auth.uid())
    );
```

**Action Required:**
Run the updated RLS policy in Supabase SQL Editor:
```sql
-- Drop the old policy
DROP POLICY IF EXISTS "Users can view tenant_users for their tenant" ON tenant_users;

-- Create the new policy
CREATE POLICY "Users can view tenant_users for their tenant"
    ON tenant_users FOR SELECT
    USING (
        tenant_id = get_user_tenant_id(auth.uid())
        OR is_super_admin(auth.uid())
    );
```

---

### 2. ✅ Next.js 15 Cookies() Async Issue

**Error:**
```
Route "/api/tenants/payment-proof" used `cookies().getAll()`. 
`cookies()` should be awaited before using its value.
```

**Root Cause:**
In Next.js 15, the `cookies()` function must be awaited as it's now an async function.

**Fix Applied:**
Updated all API routes to await `cookies()`:

**Files Fixed:**
1. `app/api/tenants/payment-proof/route.ts` - Both POST and GET handlers
2. `app/api/auth/check-email/route.ts`
3. `app/api/public/subscription-plans/route.ts`
4. `app/api/tenants/subscription-plans/route.ts` - Both GET and POST handlers

**Before:**
```typescript
const cookieStore = cookies()
```

**After:**
```typescript
const cookieStore = await cookies()
```

**Action Required:**
No action needed - code changes are complete. Restart your dev server if it's running.

---

### 3. ✅ Missing Logo File (Handled Gracefully)

**Error:**
```
GET /filmshoppee-logo.png 404 in 282ms
The requested resource isn't a valid image for /filmshoppee-logo.png received null
```

**Root Cause:**
The logo file `public/filmshoppee-logo.png` doesn't exist.

**Fix Applied:**
The `FilmshoppeeLogo` component already has error handling that shows a fallback placeholder when the image fails to load. The 404 error is expected and handled gracefully.

**Action Required:**
If you want to add the logo:
1. Place your logo file at `public/filmshoppee-logo.png`
2. The component will automatically use it
3. If the file is missing, it will show a "Filmshoppee" text placeholder

---

## Next Steps

1. **Update RLS Policy in Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the updated policy SQL (see section 1 above)

2. **Restart Dev Server:**
   - Stop your Next.js dev server
   - Run `npm run dev` again to ensure all changes are loaded

3. **Test the Application:**
   - Try accessing `/api/tenants/payment-proof` - should no longer show cookies() errors
   - Check that tenant_users queries work without infinite recursion
   - Verify the logo shows correctly (or shows fallback if file is missing)

---

## Files Modified

1. `database/02_rls_policies.sql` - Fixed RLS policy for tenant_users
2. `app/api/tenants/payment-proof/route.ts` - Fixed cookies() async calls
3. `app/api/auth/check-email/route.ts` - Fixed cookies() async call
4. `app/api/public/subscription-plans/route.ts` - Fixed cookies() async call
5. `app/api/tenants/subscription-plans/route.ts` - Fixed cookies() async calls

---

## Verification

After applying these fixes, you should see:
- ✅ No more "infinite recursion" errors in console
- ✅ No more "cookies() should be awaited" errors
- ✅ Payment proof API route works correctly
- ✅ All tenant_users queries work without errors


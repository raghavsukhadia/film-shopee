# Storage Bucket Setup Guide for Payment Proofs

## Overview
The application requires a Supabase Storage bucket named `payment-proofs` to store payment proof files (images/PDFs) uploaded by tenant admins.

## Step-by-Step Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. **Navigate to Storage**
   - Go to your Supabase project dashboard
   - Click on "Storage" in the left sidebar
   - Click "New bucket"

2. **Create the Bucket**
   - **Bucket name**: `payment-proofs` (must be exact)
   - **Public bucket**: Choose based on your needs:
     - ✅ **Public**: If you want payment proofs to be directly accessible via URL
     - ❌ **Private**: If you want to control access via RLS policies (more secure)
   - Click "Create bucket"

3. **Configure Bucket Policies (If Private)**
   - If you chose "Private", you need to set up policies
   - Go to "Policies" tab for the `payment-proofs` bucket
   - Add the following policies:

#### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow users to view their own files
```sql
CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow tenant admins to upload for their tenant
```sql
CREATE POLICY "Tenant admins can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

#### Policy 4: Allow tenant admins to view their tenant's payment proofs
```sql
CREATE POLICY "Tenant admins can view their tenant's payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.role = 'admin'
    AND (storage.foldername(name))[1] = tu.tenant_id::text
  )
);
```

#### Policy 5: Allow super admins full access
```sql
CREATE POLICY "Super admins can manage all payment proofs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);
```

---

### Option 2: Using SQL (Advanced)

If you prefer to set up everything via SQL, you can run this script in the Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true, -- Set to false if you want private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload (for their tenant)
CREATE POLICY "Tenant admins can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 2: Allow tenant admins to view their tenant's payment proofs
CREATE POLICY "Tenant admins can view their tenant's payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.role = 'admin'
    AND (storage.foldername(name))[1] = tu.tenant_id::text
  )
);

-- Policy 3: Allow super admins full access
CREATE POLICY "Super admins can manage all payment proofs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
  )
);
```

---

## Recommended Configuration

For this application, I recommend:

1. **Bucket Type**: **Public** (easier to access files via URL)
2. **File Size Limit**: 10MB (as specified in the UI)
3. **Allowed File Types**: 
   - `image/jpeg`
   - `image/png`
   - `image/jpg`
   - `application/pdf`

---

## Verification

After setting up the bucket:

1. **Test Upload**:
   - Go to Settings page in your application
   - Try uploading a payment proof file
   - You should no longer see "Storage bucket not configured" error

2. **Check Storage**:
   - Go to Supabase Dashboard → Storage → payment-proofs
   - You should see uploaded files organized by tenant_id

---

## Troubleshooting

### Error: "Storage bucket not configured"
- ✅ Make sure the bucket name is exactly `payment-proofs` (case-sensitive)
- ✅ Verify the bucket exists in Supabase Dashboard → Storage

### Error: "Storage permission denied"
- ✅ Check that RLS policies are set up correctly
- ✅ Verify the user has the correct role (admin for tenant users)
- ✅ If using private bucket, ensure policies allow access

### Error: "File too large"
- ✅ Check bucket file size limit (should be at least 10MB)
- ✅ Verify the file you're uploading is under 10MB

### Error: "Invalid file type"
- ✅ Ensure bucket allows: `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`
- ✅ Check the file extension matches the allowed types

---

## File Organization

Files are stored in the following structure:
```
payment-proofs/
  └── {tenant_id}/
      └── {timestamp}.{extension}
```

Example:
```
payment-proofs/
  └── 00000000-0000-0000-0000-000000000001/
      └── 1704123456789.png
```

This organization allows:
- Easy identification of which tenant uploaded which file
- Automatic cleanup if needed (by tenant_id)
- Better organization and management

---

## Security Considerations

1. **Public vs Private Buckets**:
   - **Public**: Files are accessible via direct URL (easier but less secure)
   - **Private**: Files require authentication (more secure, requires signed URLs)

2. **RLS Policies**:
   - Always enable RLS on storage.objects
   - Restrict access based on user roles
   - Super admins should have full access for review

3. **File Validation**:
   - The application validates file type and size on the client
   - Server-side validation is also recommended (already implemented)

---

## Next Steps

After setting up the bucket:

1. ✅ Test uploading a payment proof from the Settings page
2. ✅ Verify the file appears in Supabase Storage
3. ✅ Check that super admins can view the payment proof
4. ✅ Test the payment proof review workflow

---

## Quick Setup Script

If you want to set everything up quickly, copy and paste this into Supabase SQL Editor:

```sql
-- Create bucket (public, 10MB limit, common file types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- Note: RLS policies are automatically handled if bucket is public
-- For private buckets, you'll need to add the policies shown above
```


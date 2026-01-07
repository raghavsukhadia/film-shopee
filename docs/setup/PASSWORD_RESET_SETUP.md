# Password Reset Email Template Setup

## Professional Password Reset Email Template for Supabase

This document provides instructions for setting up a professional password reset email template in Supabase.

## Template Files

Two template versions are available:

1. **`password-reset-supabase.html`** (RECOMMENDED)
   - Optimized for email clients using table-based layout
   - Better compatibility across different email providers
   - Uses emoji icons for better support

2. **`password-reset-template.html`**
   - More modern design with SVG icons
   - May have compatibility issues with some email clients
   - Use if you need SVG support

**We recommend using `password-reset-supabase.html` for maximum compatibility.**

## How to Configure in Supabase Dashboard

1. **Log in to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Email Templates**

2. **Select Password Reset Template**
   - Click on **"Reset Password"** template
   - This is the template used when users request password resets

3. **Copy the Template**
   - Open `email-templates/password-reset-supabase.html` (recommended)
   - Copy the entire HTML content
   - Paste it into the Supabase email template editor
   - Make sure to preserve all the HTML structure

4. **Available Variables**
   Supabase provides these variables you can use:
   - `{{ .ConfirmationURL }}` - The password reset link (REQUIRED)
   - `{{ .Email }}` - User's email address
   - `{{ .Token }}` - The reset token (usually not needed)
   - `{{ .TokenHash }}` - Hashed token (usually not needed)
   - `{{ .SiteURL }}` - Your site URL

5. **Save the Template**
   - Click **Save** in the Supabase dashboard
   - Test by requesting a password reset

## Template Features

✅ **Professional Design**
- Modern, clean layout with ZORAVO branding
- Gradient header with logo colors
- Responsive design that works on all email clients

✅ **Security Information**
- Clear expiration notice (1 hour)
- Security warning for unauthorized requests
- Support contact information

✅ **User-Friendly**
- Large, prominent reset button
- Alternative text link if button doesn't work
- Step-by-step instructions
- Clear call-to-action

✅ **Branded**
- ZORAVO | OMS branding
- Co-Powered by Filmshoppee mention
- Professional color scheme matching your brand

## Customization

You can customize:
- Colors: Change the gradient colors in the header and button
- Support Email: Update `support@zoravo.in` to your actual support email
- Expiration Time: Update the "1 hour" text if your expiration is different
- Logo: Add your actual logo image URL if desired

## Testing

1. Request a password reset from your application
2. Check the email in your inbox
3. Verify:
   - Email renders correctly
   - Reset button works
   - Link is clickable
   - All styling appears correctly

## Notes

- The template uses inline CSS for maximum email client compatibility
- All colors match your ZORAVO brand colors
- The template is mobile-responsive
- Security best practices are included


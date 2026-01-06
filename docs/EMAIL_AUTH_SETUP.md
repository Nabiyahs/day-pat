# Email Magic Link Authentication Setup Guide

This document provides a complete guide for setting up email magic link (OTP) authentication with Supabase.

## How It Works

1. User enters their email on the login page
2. Supabase sends a magic link to their email
3. User clicks the link and is authenticated
4. User is redirected to the app with a valid session

This approach is:
- **Passwordless**: No passwords to remember or manage
- **Secure**: Uses PKCE flow with server-side code exchange
- **Cookie-based**: Sessions stored in HTTP-only cookies for SSR compatibility

---

## Prerequisites

- Supabase project
- Vercel deployment (or localhost for development)
- Valid email configuration in Supabase (default SMTP works for testing)

---

## 1. Supabase Dashboard Setup

### 1.1 Enable Email Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Email** and ensure it is **enabled**
5. Configure options:
   - **Confirm email**: Recommended ON for production
   - **Secure email change**: Recommended ON
   - **Enable signup**: ON

### 1.2 Configure URL Settings

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL**:
   - For development: `http://localhost:3000`
   - For production: `https://your-vercel-domain.vercel.app`
3. Add **Redirect URLs** (one per line):

```
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

> **Important**: These URLs must match exactly what your app sends as `emailRedirectTo`.

### 1.3 Configure Email Templates (Optional)

1. Go to **Authentication** > **Email Templates**
2. Customize the "Magic Link" template if desired
3. The default template includes a secure link that users click to authenticate

---

## 2. Environment Variables

### 2.1 Local Development (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2.2 Vercel Environment Variables

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

---

## 3. Verification Checklist

### Supabase Dashboard
- [ ] Email provider enabled
- [ ] Site URL configured correctly
- [ ] Redirect URLs include:
  - [ ] `http://localhost:3000/auth/callback` (for development)
  - [ ] `https://your-vercel-domain.vercel.app/auth/callback` (for production)

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly

---

## 4. Testing

### Local Testing

1. Run `npm run dev`
2. Go to `http://localhost:3000`
3. Complete onboarding (or skip)
4. Enter your email on the login page
5. Click "Send Magic Link"
6. Check your email for the magic link
7. Click the link - you should be redirected to `/app`

### Production Testing

1. Deploy to Vercel
2. Go to `https://your-vercel-domain.vercel.app`
3. Complete the login flow
4. Verify you're redirected to `/app` with a valid session

---

## 5. Troubleshooting

### "PKCE code verifier not found" Error

**Cause**: Cookie storage issue - the PKCE verifier wasn't stored properly

**Fix**:
1. Ensure you're using `@supabase/ssr` with cookie-based storage
2. Check that middleware is properly refreshing sessions
3. Clear browser cookies and try again

### Magic link doesn't arrive

**Cause**: Email delivery issues

**Fix**:
1. Check spam folder
2. Verify email address is correct
3. In production, consider using a custom SMTP provider in Supabase Dashboard > Project Settings > Auth > SMTP Settings

### "Invalid redirect URL" Error

**Cause**: The redirect URL sent by the app isn't in Supabase's allowed list

**Fix**:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add your app's callback URL to the Redirect URLs list
3. Ensure it matches exactly (including trailing slashes)

### Session not persisting after login

**Cause**: Cookie settings or middleware issue

**Fix**:
1. Ensure middleware.ts is running on all routes (check matcher config)
2. Verify the `/auth/callback` route is using server-side code exchange
3. Check browser dev tools for cookie presence

### Debug Mode

In development, both the login page and app page have debug panels:
- **Login page**: Click "Show Debug Info" to see redirect URLs and Supabase config
- **App page**: Click the bug icon in bottom right to see session details

---

## 6. Authentication Flow Summary

```
User visits / (root page)
    ↓
Server checks session
    ↓
No session → Client checks localStorage for onboarding
    ↓
If onboarding incomplete → /onboarding
If onboarding complete → /login
    ↓
User enters email → "Send Magic Link"
    ↓
Supabase sends email with magic link
    ↓
User clicks link → /auth/callback?code=xxx
    ↓
Server exchanges code for session (cookies set)
    ↓
Redirect to /app
    ↓
Middleware refreshes session on each request
    ↓
User is authenticated!
```

---

## 7. Code Architecture

### Key Files

- `src/lib/supabase/client.ts` - Browser client (cookie-based)
- `src/lib/supabase/server.ts` - Server client for RSC/API routes
- `src/lib/supabase/middleware.ts` - Session refresh middleware helper
- `src/middleware.ts` - Next.js middleware configuration
- `src/app/auth/callback/route.ts` - Code exchange endpoint
- `src/app/login/page.tsx` - Login page with email form

### Session Storage

Sessions are stored in HTTP-only cookies using the `@supabase/ssr` package. This approach:
- Works with Server-Side Rendering (SSR)
- Is more secure than localStorage
- Handles PKCE flow correctly

---

## Support

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Discord](https://discord.supabase.com)

# Paycheck Planner - Complete Setup Guide

## Overview
This guide will help you set up Paycheck Planner locally and in Supabase, including the premium test user with sample data.

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- VS Code or similar editor

## Step 1: Local Setup (5 minutes)

### 1.1 Install Dependencies
```bash
npm install
# or
yarn install
```

### 1.2 Environment Variables
Copy `.env.local.example` to `.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (optional for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 1.3 Run Development Server
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the landing page.

## Step 2: Supabase Setup (10 minutes)

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Name it "paycheck-planner"
5. Set a strong password
6. Wait for project to initialize (2-3 minutes)

### 2.2 Get Your Connection Details
1. Go to Project Settings > API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
3. Add these to `.env.local`

### 2.3 Run Database Setup SQL
1. Open Supabase > SQL Editor
2. Click "New Query"
3. Open `SUPABASE_SETUP_COMPLETE.sql`
4. **IMPORTANT:** Before running, you must:
   - Create the auth user first (see Step 2.4)
   - Get the User ID
   - Replace `'YOUR_USER_ID_HERE'` with your actual ID
5. Paste the entire script
6. Click "Run"

### 2.4 Create Premium Test User
1. Go to Supabase > Authentication > Users
2. Click "Add User"
3. Fill in:
   - **Email:** `premium-demo@paycheckplanner.ai`
   - **Password:** `DemoPassword123!`
   - Check "Auto confirm user"
4. Click "Create User"
5. The user appears in the list - **Click on it**
6. Copy the **ID** field (long UUID)
7. Keep this open - you'll need it next

### 2.5 Update SQL Script with User ID
1. Open `SUPABASE_SETUP_COMPLETE.sql` in your editor
2. Find this line (around line 285):
   ```sql
   test_user_id UUID := 'YOUR_USER_ID_HERE';
   ```
3. Replace `'YOUR_USER_ID_HERE'` with your User ID from Step 2.4
   - Example: `'92a89f74-2642-4735-b9ed-2f344f04abc3'`
4. Save the file

### 2.6 Run the SQL Script
1. Go back to Supabase > SQL Editor
2. New Query
3. Paste the updated `SUPABASE_SETUP_COMPLETE.sql`
4. Click "Run"
5. You should see success messages

### 2.7 Verify Setup
In the same SQL Editor, run this verification query:

```sql
SELECT 
    p.id,
    p.email,
    p.plan,
    p.is_pro,
    COUNT(DISTINCT d.id) as debts,
    COUNT(DISTINCT b.id) as bills,
    COUNT(DISTINCT a.id) as assets
FROM public.profiles p
LEFT JOIN public.debts d ON p.id = d.user_id
LEFT JOIN public.bills b ON p.id = b.user_id
LEFT JOIN public.assets a ON p.id = a.user_id
WHERE p.email = 'premium-demo@paycheckplanner.ai'
GROUP BY p.id, p.email, p.plan, p.is_pro;
```

Expected result:
- email: `premium-demo@paycheckplanner.ai`
- plan: `premium`
- is_pro: `true`
- debts: `3`
- bills: `3`
- assets: `3`

## Step 3: Test the Application (10 minutes)

### 3.1 Test Landing Page
1. Visit `http://localhost:3000`
2. You should see:
   - Logo in header (sized correctly)
   - Professional hero section
   - Features grid
   - Legal disclaimers in footer
   - Navigation links to Pricing and Login

### 3.2 Test Premium Login
1. Click "Login" or go to `http://localhost:3000/login`
2. Enter credentials:
   - Email: `premium-demo@paycheckplanner.ai`
   - Password: `DemoPassword123!`
3. You should see the dashboard with:
   - 3 sample debts
   - 3 sample bills
   - 3 sample assets
   - Premium features unlocked

### 3.3 Test Pricing Page
1. Go to `http://localhost:3000/pricing`
2. You should see:
   - 3 pricing tiers: Free, Starter, Premium
   - Feature comparison with ✔ and ✖ marks
   - Monthly/Annual toggle
   - Current Plan indicator

### 3.4 Test Legal Pages
1. Visit `/terms` - Terms of Service
2. Visit `/privacy` - Privacy Policy
3. Visit `/disclaimer` - Financial Disclaimer
4. Scroll footer on any page to see legal text

## Step 4: 2FA/MFA Setup (Optional)

### 4.1 Enable 2FA in Account Settings
1. Log in as `premium-demo@paycheckplanner.ai`
2. Go to Account Settings
3. Find "Two-Factor Authentication"
4. Click "Enable 2FA"
5. Install an authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
6. Scan the QR code
7. Enter the 6-digit code
8. Save backup codes in a safe place

## Troubleshooting

### SQL Script Error: "violates foreign key constraint"
**Solution:** User ID in SQL doesn't match actual auth user
- Verify User ID from Supabase Auth > Users
- Make sure it's replaced in the SQL script
- Run verification query from Step 2.7

### Logo not showing
**Solution:** Check public/logo.png exists
```bash
ls -la public/logo.png
```
If missing, add your logo file there

### Can't login
**Solution:** Check user was created
1. Go to Supabase > Authentication > Users
2. Verify `premium-demo@paycheckplanner.ai` exists
3. Check email is confirmed
4. Test with correct password: `DemoPassword123!`

### Dashboard shows empty
**Solution:** Check SQL script ran successfully
1. Supabase > SQL Editor
2. Run verification query from Step 2.7
3. Should show 3 debts, 3 bills, 3 assets

## Features Unlocked for Premium User

### Dashboard
- ✅ Debt summary with total balance
- ✅ Bills overview
- ✅ Assets summary
- ✅ Financial metrics

### Debt Management
- ✅ Unlimited debts (free: 3, starter: 10, premium: unlimited)
- ✅ Payoff strategy comparison (Snowball & Avalanche)
- ✅ Interest rate tracking
- ✅ Minimum payment calculations

### AI Features (Premium)
- ✅ AI Debt Advisor
- ✅ AI Strategy Recommendations
- ✅ Payoff optimization
- ✅ Financial insights

### Analytics (Premium)
- ✅ Advanced charts
- ✅ Debt freedom countdown
- ✅ Financial milestones
- ✅ Scenario simulator

### Security (All Plans)
- ✅ Email/password auth
- ✅ 2FA/MFA support
- ✅ Row-level security in database
- ✅ Encrypted sensitive data

## File Structure

```
paycheck-planner/
├── app/
│   ├── page.tsx              # Professional landing page
│   ├── pricing/page.tsx       # 3-tier pricing (unchanged)
│   ├── dashboard/page.tsx     # User dashboard
│   ├── login/page.tsx         # Login page
│   ├── signup/page.tsx        # Signup page
│   ├── terms/page.tsx         # Terms of Service
│   ├── privacy/page.tsx       # Privacy Policy
│   ├── disclaimer/page.tsx    # Financial Disclaimer
│   ├── api/auth/2fa/          # 2FA API routes
│   │   ├── setup/route.ts     # Generate QR code
│   │   └── verify/route.ts    # Verify 2FA code
│   ├── components/
│   │   ├── Logo.tsx           # Logo component (all pages)
│   │   ├── TwoFactorAuth.tsx  # 2FA component
│   │   └── ... (other components)
│   └── layout.tsx             # Root layout with header
├── lib/
│   ├── supabase/             # Supabase client config
│   └── ... (other utilities)
├── public/
│   └── logo.png              # Your logo file
├── SUPABASE_SETUP_COMPLETE.sql  # Database setup (THIS FILE)
├── package.json
└── .env.local                # Environment variables

```

## Database Schema

### Main Tables
1. **profiles** - User accounts and subscription info
2. **debts** - User's debts with balance & interest
3. **bills** - Monthly bills and reminders
4. **assets** - Savings, investments, property
5. **income** - Income sources
6. **subscriptions** - Stripe subscription tracking
7. **transactions** - Financial transactions
8. **referrals** - Referral tracking

### Security
- Row-Level Security (RLS) enabled
- Users can only see their own data
- Foreign key constraints for data integrity
- Encrypted sensitive fields

## Next Steps

1. **Customize Branding**
   - Add your logo to `public/logo.png`
   - Update company name in footer
   - Customize colors in Tailwind config

2. **Connect Stripe** (for real payments)
   - Get Stripe API keys
   - Add to environment variables
   - Test checkout flow

3. **Enable Email** (for notifications)
   - Configure email provider (Resend, SendGrid, etc.)
   - Set up transactional emails
   - Test email notifications

4. **Deploy**
   - Deploy to Vercel: `vercel deploy`
   - Set environment variables in production
   - Enable HTTPS
   - Set up custom domain

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Check Next.js docs: https://nextjs.org/docs
4. Contact support at: support@paycheckplanner.ai

## Summary

You now have a complete, production-ready Paycheck Planner setup with:
- ✅ Professional landing page with legal disclaimers
- ✅ 3-tier pricing page
- ✅ Premium test user with sample data
- ✅ 2FA/MFA support
- ✅ Logo on all pages
- ✅ Secure database with RLS
- ✅ Ready to customize and deploy

Happy planning! 🚀

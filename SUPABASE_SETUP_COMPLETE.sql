-- ============================================================================
-- PAYCHECK PLANNER - COMPLETE SUPABASE SETUP
-- ============================================================================
-- This script creates all necessary tables and adds a premium test user
-- with sample financial data for testing
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'premium')),
  is_pro BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'canceled')),
  stripe_customer_id TEXT UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

-- ============================================================================
-- 2. DEBTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(12, 2) NOT NULL CHECK (balance >= 0),
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  minimum_payment NUMERIC(10, 2) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON public.debts(created_at);

-- ============================================================================
-- 3. BILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);

-- ============================================================================
-- 4. ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT DEFAULT 'savings' CHECK (asset_type IN ('savings', 'checking', 'investment', 'property', 'other')),
  value NUMERIC(15, 2) NOT NULL CHECK (value >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

-- ============================================================================
-- 5. INCOME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_income_user_id ON public.income(user_id);

-- ============================================================================
-- 6. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'premium')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'canceled', 'past_due')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- ============================================================================
-- 7. TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  category TEXT,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);

-- ============================================================================
-- 8. REFERRALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);

-- ============================================================================
-- ROW LEVEL SECURITY - Ensure users can only see their own data
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Debts RLS
CREATE POLICY "Users can view own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- Bills RLS
CREATE POLICY "Users can view own bills" ON public.bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills" ON public.bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills" ON public.bills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills" ON public.bills
  FOR DELETE USING (auth.uid() = user_id);

-- Assets RLS
CREATE POLICY "Users can view own assets" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON public.assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" ON public.assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" ON public.assets
  FOR DELETE USING (auth.uid() = user_id);

-- Income RLS
CREATE POLICY "Users can view own income" ON public.income
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income" ON public.income
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income" ON public.income
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income" ON public.income
  FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions RLS
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Transactions RLS
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals RLS
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

-- ============================================================================
-- CREATE PREMIUM TEST USER - REPLACE USER_ID_HERE WITH YOUR ACTUAL ID
-- ============================================================================
-- Step 1: Create auth user in Supabase Auth Console
-- Email: premium-demo@paycheckplanner.ai
-- Password: DemoPassword123!
-- Then copy the User ID and replace 'YOUR_USER_ID_HERE' below

DO $$
DECLARE
    test_user_id UUID := 'YOUR_USER_ID_HERE';
BEGIN
    -- Only run if we have a valid User ID
    IF test_user_id::text != 'YOUR_USER_ID_HERE' THEN
        
        -- Create profile
        INSERT INTO public.profiles (id, email, full_name, plan, is_pro, subscription_status)
        VALUES (
            test_user_id,
            'premium-demo@paycheckplanner.ai',
            'Premium Demo User',
            'premium',
            true,
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            plan = 'premium',
            is_pro = true,
            subscription_status = 'active';

        -- Add Subscription
        INSERT INTO public.subscriptions (user_id, tier, status, current_period_start, current_period_end)
        VALUES (
            test_user_id,
            'premium',
            'active',
            now(),
            now() + interval '30 days'
        );

        -- Add Sample Debt 1: Credit Card
        INSERT INTO public.debts (user_id, name, balance, interest_rate, minimum_payment, due_date)
        VALUES (
            test_user_id,
            'Credit Card - Visa',
            5000.00,
            18.50,
            150.00,
            CURRENT_DATE + interval '15 days'
        );

        -- Add Sample Debt 2: Student Loan
        INSERT INTO public.debts (user_id, name, balance, interest_rate, minimum_payment, due_date)
        VALUES (
            test_user_id,
            'Federal Student Loan',
            25000.00,
            5.50,
            250.00,
            CURRENT_DATE + interval '1 day'
        );

        -- Add Sample Debt 3: Car Loan
        INSERT INTO public.debts (user_id, name, balance, interest_rate, minimum_payment, due_date)
        VALUES (
            test_user_id,
            'Auto Loan - Car',
            15000.00,
            4.20,
            350.00,
            CURRENT_DATE + interval '10 days'
        );

        -- Add Sample Bills
        INSERT INTO public.bills (user_id, name, amount, due_date, frequency)
        VALUES 
            (test_user_id, 'Electric Bill', 120.00, 15, 'monthly'),
            (test_user_id, 'Internet', 79.99, 1, 'monthly'),
            (test_user_id, 'Gym Membership', 45.00, 20, 'monthly');

        -- Add Sample Assets
        INSERT INTO public.assets (user_id, name, asset_type, value)
        VALUES 
            (test_user_id, 'Savings Account', 'savings', 5000.00),
            (test_user_id, 'Emergency Fund', 'savings', 3000.00),
            (test_user_id, 'Investment Account', 'investment', 12000.00);

        -- Add Sample Income
        INSERT INTO public.income (user_id, source, amount, frequency)
        VALUES 
            (test_user_id, 'Full-time Job', 4500.00, 'monthly'),
            (test_user_id, 'Side Gig', 500.00, 'monthly');

        RAISE NOTICE 'Premium test user created successfully!';
        RAISE NOTICE 'Email: premium-demo@paycheckplanner.ai';
        RAISE NOTICE 'Password: DemoPassword123!';
        RAISE NOTICE 'Plan: Premium';
        RAISE NOTICE 'Sample Data: 3 debts, 3 bills, 3 assets, 2 income sources';
    ELSE
        RAISE WARNING 'USER_ID_HERE not replaced! Please update the SQL with your actual User ID from Supabase Auth.';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything was set up correctly:

-- Check if premium user exists
SELECT 
    p.id,
    p.email,
    p.plan,
    p.is_pro,
    p.subscription_status,
    COUNT(DISTINCT d.id) as total_debts,
    COUNT(DISTINCT b.id) as total_bills,
    COUNT(DISTINCT a.id) as total_assets
FROM public.profiles p
LEFT JOIN public.debts d ON p.id = d.user_id
LEFT JOIN public.bills b ON p.id = b.user_id
LEFT JOIN public.assets a ON p.id = a.user_id
WHERE p.email = 'premium-demo@paycheckplanner.ai'
GROUP BY p.id, p.email, p.plan, p.is_pro, p.subscription_status;

-- Check debts summary
SELECT 
    SUM(balance) as total_debt,
    COUNT(*) as number_of_debts
FROM public.debts
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'premium-demo@paycheckplanner.ai');

-- Check bills summary
SELECT 
    SUM(amount) as total_monthly_bills,
    COUNT(*) as number_of_bills
FROM public.bills
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'premium-demo@paycheckplanner.ai');

-- Check assets summary
SELECT 
    SUM(value) as total_assets
FROM public.assets
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'premium-demo@paycheckplanner.ai');

# 🎯 Paycheck Planner

**Legal Operator & Owner:** DiBeasi Global Investment LLC  
**Version:** 1.0 Production Ready  
**Status:** Enterprise Grade - Deployment Ready

> Professional debt elimination platform with AI-powered financial insights

---

## ⚖️ Legal Notice

Paycheck Planner is **owned and operated by DiBeasi Global Investment LLC**. All intellectual property, technology, content, trademarks, and proprietary materials are the exclusive property of DiBeasi Global Investment LLC. Unauthorized use, reproduction, or distribution is prohibited.

**Disclaimer:** Paycheck Planner provides educational tools and planning resources only. We do NOT provide financial, legal, or investment advice. Always consult a licensed financial advisor before making major financial decisions.

---

## 🚀 What's New (This Release)

✅ **Professional Landing Page** - Custom design with hero section and feature grid  
✅ **Legal Disclaimers** - Full legal compliance on landing page and footer  
✅ **2FA/MFA Support** - QR code-based two-factor authentication  
✅ **Logo on All Pages** - Responsive logo component on every page  
✅ **Complete Supabase Setup** - One SQL script for everything  
✅ **Premium Test User** - Ready-to-use demo account with sample data  
✅ **Original Pricing Page** - 3-tier pricing with feature matrix (unchanged)  

## 📋 Features

### Core Features
- 💰 Debt tracker with unlimited debts (premium)
- 📊 Interactive debt payoff calculator
- 🎯 Snowball & Avalanche strategy comparison
- 📈 Real-time financial dashboards
- 💡 AI-powered debt recommendations
- 🔔 Bill reminders and tracking
- 💪 Financial milestones

### Security
- 🔐 Email/password authentication
- 🔑 Two-factor authentication (2FA/MFA) with QR code
- 🛡️ Row-level database security
- 🔒 Bank-grade AES-256 encryption
- 📋 Privacy Policy & Terms of Service

### Subscription Tiers
1. **Free** - Basic debt tracking (up to 3 debts)
2. **Starter** - Enhanced features (up to 10 debts) - $3/month
3. **Premium** - Full features (unlimited debts) - $6/month

## 🎬 Quick Start (10 minutes)

### Step 1: Clone & Install
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Step 2: Supabase Setup
1. Create account at https://supabase.com
2. Create new project
3. Get your API keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add to `.env.local`

### Step 3: Create Test User
1. Go to Supabase > Authentication > Users
2. Add User:
   - Email: `premium-demo@paycheckplanner.ai`
   - Password: `DemoPassword123!`
3. Copy the User ID

### Step 4: Run Database Setup
1. Get your User ID from step 3
2. Edit `SUPABASE_SETUP_COMPLETE.sql`
3. Replace `'YOUR_USER_ID_HERE'` with your ID
4. Supabase > SQL Editor > New Query
5. Paste entire script and run
6. Done! ✅

### Step 5: Run Locally
```bash
npm run dev
```

Visit http://localhost:3000 and login with:
- **Email:** `premium-demo@paycheckplanner.ai`
- **Password:** `DemoPassword123!`

## 📁 What's Included

```
paycheck-planner/
├── 🌐 Landing Page (app/page.tsx)
│   ├── Professional hero section
│   ├── Features showcase
│   ├── CTA buttons
│   └── Legal disclaimers
│
├── 💰 Pricing Page (app/pricing/page.tsx)
│   ├── 3 subscription tiers
│   ├── Feature comparison matrix
│   ├── Monthly/Annual toggle
│   └── Stripe integration ready
│
├── 🔐 Authentication
│   ├── Login/Signup pages
│   ├── Password reset
│   ├── 2FA/MFA with QR code
│   └── Supabase Auth integration
│
├── 📊 Dashboard
│   ├── Debt summary
│   ├── Bill tracking
│   ├── Asset overview
│   ├── AI recommendations
│   └── Advanced analytics
│
├── 📚 Legal Pages
│   ├── Terms of Service
│   ├── Privacy Policy
│   └── Financial Disclaimer
│
├── 🗄️ Database
│   ├── Complete Supabase schema
│   ├── Row-level security
│   ├── Sample data (3 debts, bills, assets)
│   └── Premium test user included
│
└── 📖 Documentation
    ├── SETUP_GUIDE.md (detailed setup)
    ├── SUPABASE_SETUP_COMPLETE.sql (database)
    ├── .env.local.example (template)
    └── README.md (this file)
```

## 🎯 Premium Test User

After running the SQL setup, you have:

**Account:**
- Email: `premium-demo@paycheckplanner.ai`
- Password: `DemoPassword123!`
- Plan: Premium (all features unlocked)

**Sample Data:**
- 3 Debts ($45,000 total)
  - Credit Card: $5,000 @ 18.5% APR
  - Student Loan: $25,000 @ 5.5% APR
  - Car Loan: $15,000 @ 4.2% APR
  
- 3 Bills ($244.99/month)
  - Electric: $120
  - Internet: $79.99
  - Gym: $45
  
- 3 Assets ($20,000 total)
  - Savings: $5,000
  - Emergency Fund: $3,000
  - Investments: $12,000

## 🔒 Security Features

- ✅ Supabase Authentication
- ✅ Row-Level Security (RLS)
- ✅ 2FA with QR code
- ✅ Password hashing
- ✅ Encrypted sensitive data
- ✅ GDPR/CCPA compliant
- ✅ Bank-grade security

## 📚 Technology Stack

**Frontend:**
- Next.js 16+ (React 19)
- TypeScript
- Tailwind CSS
- Lucide React (icons)

**Backend:**
- Supabase (PostgreSQL)
- Next.js API Routes
- Stripe (payments)

**Authentication:**
- Supabase Auth
- JWT tokens
- 2FA/MFA support

**Database:**
- PostgreSQL (Supabase)
- Row-level security
- Real-time subscriptions ready

## 🛠️ Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

## 📖 Documentation

- **SETUP_GUIDE.md** - Detailed setup instructions (read this first!)
- **SUPABASE_SETUP_COMPLETE.sql** - Database schema and sample data
- **.env.local.example** - Environment variable template

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy!

```bash
vercel deploy
```

### Deploy to Other Platforms

- Netlify
- Railway
- Render
- DigitalOcean App Platform

## 📱 Pages Included

| Page | Route | Status | Features |
|------|-------|--------|----------|
| Landing | `/` | ✅ Complete | Hero, features, legal disclaimer |
| Pricing | `/pricing` | ✅ Complete | 3 tiers, feature matrix, toggle |
| Login | `/login` | ✅ Complete | Email/password auth |
| Signup | `/signup` | ✅ Complete | Registration form |
| Dashboard | `/dashboard` | ✅ Complete | Main app (premium features) |
| Terms | `/terms` | ✅ Complete | Legal terms |
| Privacy | `/privacy` | ✅ Complete | Privacy policy |
| Disclaimer | `/disclaimer` | ✅ Complete | Financial disclaimer |

## 🐛 Troubleshooting

### "Database error" when logging in
- Check Supabase is initialized
- Verify SQL script ran successfully
- Check environment variables

### Logo not showing
- Verify `public/logo.png` exists
- Check file path is correct
- Restart dev server

### 2FA not working
- Install authenticator app (Google Authenticator, Authy, etc.)
- Verify QR code scan was successful
- Check code is entered correctly

### "User already exists"
- User was already created
- Sign up with different email
- Or reset via forgot password

## 🤝 Support

Need help? Check:
1. SETUP_GUIDE.md for detailed instructions
2. Troubleshooting section above
3. Supabase documentation
4. Next.js documentation

## 📄 License

MIT License - See LICENSE file

## 🎉 What's Next?

1. ✅ Customize branding (add your logo)
2. ✅ Configure Stripe (for real payments)
3. ✅ Set up email service (for notifications)
4. ✅ Deploy to production
5. ✅ Launch to users!

## 📞 Questions?

- Check SETUP_GUIDE.md
- Review code comments
- Check Supabase docs
- Email: support@paycheckplanner.ai

---

**Ready to help users eliminate debt? Let's go! 🚀**

Happy Planning!

import Link from "next/link"
import { ArrowRight, TrendingDown, Zap, Target, Shield, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-semibold">
              ✨ Smart Financial Planning
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Master Your Money,<br />
            <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Eliminate Debt Fast
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Plan every paycheck with precision. Get real-time insights. Accelerate your path to financial freedom.
            Just like Acorns makes saving simple, we make debt elimination predictable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all duration-200 border border-slate-600"
            >
              View Plans
            </Link>
          </div>

          <p className="text-slate-400 text-sm">
            🔒 Bank-level security • 📊 Real-time analytics • ⚡ Instant predictions
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Modern Financial Management
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to understand your finances and make smarter decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingDown,
                title: "Smart Debt Elimination",
                description: "AI-powered strategies that show exactly when you'll be debt-free. No surprises, just predictable progress.",
              },
              {
                icon: Zap,
                title: "Real-Time Insights",
                description: "See where every dollar goes. Understand your cash flow at a glance with beautiful, actionable charts.",
              },
              {
                icon: Target,
                title: "Goal Tracking",
                description: "Set financial milestones and watch them happen. Get motivated by real progress toward freedom.",
              },
              {
                icon: BarChart3,
                title: "Scenario Simulations",
                description: "Ask 'what if' questions. Adjust payments and see outcomes instantly. Plan with confidence.",
              },
              {
                icon: Shield,
                title: "Bank-Level Security",
                description: "Your data is encrypted and protected. We partner with industry-leading security providers.",
              },
              {
                icon: TrendingDown,
                title: "Multi-Strategy Support",
                description: "Avalanche, Snowball, or custom strategies. We help you find the best approach for your situation.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 rounded-xl hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
              >
                <feature.icon className="w-12 h-12 text-green-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple Setup, Powerful Results
            </h2>
            <p className="text-xl text-slate-400">
              Get started in minutes, just like Acorns.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Sign Up",
                description: "Create your account in under 2 minutes. Secure and simple.",
              },
              {
                step: "2",
                title: "Add Your Data",
                description: "Enter your debts, bills, and income. No integration required.",
              },
              {
                step: "3",
                title: "Get a Strategy",
                description: "Instantly see your debt-free date and optimal payoff plan.",
              },
              {
                step: "4",
                title: "Track Progress",
                description: "Watch your progress in real-time. Stay motivated and on track.",
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 text-center">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-center text-sm">
                    {item.description}
                  </p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-full w-6 h-0.5 bg-gradient-to-r from-green-500 to-transparent -ml-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Paycheck Planner?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                Like Acorns + Rocket Mortgage
              </h3>
              <ul className="space-y-4">
                {[
                  "Simple, intuitive interface (Acorns-style)",
                  "Professional, structured approach (Rocket Mortgage-style)",
                  "Real-time calculations and predictions",
                  "Multiple strategy options for flexibility",
                  "Beautiful visualizations of progress",
                  "Bank-level security and privacy",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-400 font-bold mt-1">✓</span>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Real Example
              </h3>
              <div className="space-y-4 text-slate-300">
                <div>
                  <p className="text-sm text-slate-400">Your situation</p>
                  <p className="text-white font-semibold">$45,000 in debt</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Traditional approach</p>
                  <p className="text-white font-semibold">8-10 years to freedom</p>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-400">With Paycheck Planner</p>
                  <p className="text-green-400 font-bold text-lg">5-6 years (optimized strategy)</p>
                </div>
                <p className="text-sm text-slate-400 pt-4">
                  See exactly what's possible. Adjust your strategy anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8 md:p-12 text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">
              We Take Your Privacy Seriously
            </h3>
            <p className="text-slate-300 max-w-2xl mx-auto mb-6">
              Your financial data is encrypted with bank-level security. We never sell your information.
              Read our complete{" "}
              <Link href="/privacy" className="text-green-400 hover:text-green-300">
                privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-green-400 hover:text-green-300">
                terms of service
              </Link>.
            </p>
            <Link
              href="/disclaimer"
              className="inline-block text-sm text-slate-400 hover:text-slate-300 border-b border-slate-600 hover:border-slate-400"
            >
              Financial Disclaimer
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of people on their path to financial freedom.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-4 bg-white text-green-700 font-semibold rounded-lg hover:bg-slate-100 transition-all duration-200 shadow-xl"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <Link href="/pricing" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-white transition">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="hover:text-white transition">
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Security</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Bank-level encryption</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>GDPR Compliant</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a 
                    href="mailto:support@paycheckplanner.ai?subject=Help%20Request"
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Email Support
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:support@paycheckplanner.ai"
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Get Help
                  </a>
                </li>
                <li className="text-slate-500 mt-2 pt-2 border-t border-slate-700">
                  support@paycheckplanner.ai
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <p className="text-slate-400 text-sm text-center">
              © {new Date().getFullYear()} Paycheck Planner. All rights reserved.
              <br />
              <span className="text-slate-500 text-xs">
                Questions? Email us at{' '}
                <a 
                  href="mailto:support@paycheckplanner.ai" 
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  support@paycheckplanner.ai
                </a>
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
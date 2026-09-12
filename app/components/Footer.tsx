'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppQrCode from './AppQrCode'

export default function Footer() {
  // The homepage has its own full "Your Financial Plan. In Your Pocket."
  // section with a phone mockup right above the footer -- per Vince's Aug
  // 23 2026 feedback, having this same Google Play pitch repeated again
  // immediately below it read as a redundant, competing section rather
  // than a footer utility. Everywhere else, this is the only app promo on
  // the page, so it stays.
  const pathname = usePathname()
  const isHomepage = pathname === '/'

  return (
    <footer className="border-t border-gray-800 bg-[#020617]">
      <div className="flex justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          {/* Get the App - store badge + QR code. Hidden on any phone-width
              screen (Chrome mobile, Safari mobile, the native app -- all of
              them) via a pure CSS breakpoint, since JS-based native-app
              detection wasn't reliably matching what's actually being tested
              against. Only ever shows on desktop/tablet-width web.
              Google Play is live -- badge and QR both link to the real
              listing. The App Store badge stays "coming soon" until iOS is
              actually submitted; swap it for the official "Download on the
              App Store" badge asset (per Apple's brand guidelines) at that
              point. Skipped entirely on the homepage -- see isHomepage
              above -- since the homepage already pitches the app with its
              own dedicated section. */}
          {!isHomepage && (
          <div className="mb-12 hidden rounded-2xl border border-gray-800 bg-[#0f172a] p-6 md:block">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-white">Get the Paycheck Planner app</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Available now on Google Play. Coming soon to the App Store.
                </p>
                <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row md:items-start">
                  <a href="/app?s=footer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 transition hover:border-gray-500"
                  >
                    <span className="text-xs text-gray-400">Get it on</span>
                    <span className="font-semibold">Google Play</span>
                  </a>
                  <span
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 opacity-70"
                    title="Coming soon to the App Store"
                  >
                    <span className="text-xs text-gray-500">Download on the</span>
                    <span className="font-semibold">App Store</span>
                  </span>
                </div>
              </div>

              {/* Not a link. Clicking a QR code on the machine you are
                  already sitting at accomplishes nothing -- the code exists
                  for the phone, and the store link is right there to its
                  left for anyone who wants to click something. */}
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center rounded-lg border border-gray-700 bg-white p-2"
                  title="Scan to get the Paycheck Planner app"
                >
                  <AppQrCode className="h-36 w-36" />
                </div>
                <p className="mt-2 text-xs text-gray-500">Scan to download</p>
              </div>
            </div>
          </div>
          )}

          {/* Footer Links Grid -- reorganized into 5 focused groups (Aug 23
              2026) instead of one long "Product" column with everything
              crammed in. Same links, same SEO/internal-linking value (see
              Aug 18 2026 note below on why these are linked from the footer
              at all) -- just grouped so the footer reads as intentional. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 mb-12 md:grid-cols-3 md:gap-10 lg:grid-cols-6 lg:gap-12">
            {/* Product */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Product</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/features" className="hover:text-white transition">Features</Link></p>
                <p><Link href="/pricing" className="hover:text-white transition">Pricing</Link></p>
                <p><Link href="/ai-chat" className="hover:text-white transition">AI Chat</Link></p>
                <p><Link href="/calculators" className="hover:text-white transition">Calculators</Link></p>
              </div>
            </div>

            {/* In the app -- Sep 12 2026. These four are the features the app
                is actually built around, and until now not one of them was
                linked anywhere outside the signed-in sidebar: someone who
                landed on the marketing site had no way to even learn Safe to
                Spend exists.

                Unlike every other column here, these are auth-gated (see
                PROTECTED in middleware.ts), so a logged-out visitor clicking
                one lands on /login?redirectTo=<path> and is returned here
                after signing in -- deliberate, and the reason /safe-to-spend
                was added to PROTECTED in the same change (its page.tsx
                redirected on its own, which threw the destination away and
                dumped the visitor on a bare login form).

                They are not indexable and are not in sitemap.xml, so this
                column is a product/navigation aid, not an SEO play like the
                Tools column below. */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">In the app</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/safe-to-spend" className="hover:text-white transition">Safe to Spend</Link></p>
                <p><Link href="/paycheck-shield" className="hover:text-white transition">Paycheck Shield</Link></p>
                <p><Link href="/survival-mode" className="hover:text-white transition">Survival Mode</Link></p>
                <p><Link href="/paycheck-autopilot" className="hover:text-white transition">Paycheck Autopilot</Link></p>
                <p><Link href="/debt-payoff-calculator" className="hover:text-white transition">Payoff Calculator</Link></p>
              </div>
            </div>

            {/* Tools -- Aug 18 2026: these marketing/content pages were only
                ever reachable via sitemap.xml, with no link from the
                homepage, nav, or footer. Search Console flagged all of them
                "Discovered - currently not indexed" -- Google found the URLs
                but had no internal-link signal telling it they were worth
                crawling. Linking them from the footer (rendered on every
                page) gives them real internal PageRank instead of relying on
                the sitemap alone. */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Tools</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/money-score" className="hover:text-white transition">Money Score</Link></p>
                <p><Link href="/budget-by-salary" className="hover:text-white transition">Budget by Salary</Link></p>
                <p><Link href="/debt-payoff-plans" className="hover:text-white transition">Debt Payoff Plans</Link></p>
                <p><Link href="/challenge" className="hover:text-white transition">30-Day Challenge</Link></p>
                {/* Public, priority 0.7 in sitemap.xml, and linked from
                    nowhere on the site until Sep 12 2026 -- exactly the
                    "Discovered - currently not indexed" case the rest of
                    this column was created to fix. */}
                <p><Link href="/best-budgeting-apps-paycheck-to-paycheck" className="hover:text-white transition">Best Budgeting Apps</Link></p>
              </div>
            </div>

            {/* Resources */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Resources</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/worksheet" className="hover:text-white transition">Free Worksheet</Link></p>
                <p><Link href="/university" className="hover:text-white transition">University</Link></p>
                <p><Link href="/blog" className="hover:text-white transition">Blog</Link></p>
                <p><Link href="/compare" className="hover:text-white transition">Compare Apps</Link></p>
              </div>
            </div>

            {/* Company */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Company</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/about" className="hover:text-white transition">About</Link></p>
                <p><Link href="/contact" className="hover:text-white transition">Contact</Link></p>
                <p><Link href="/support" className="hover:text-white transition">Support</Link></p>
              </div>
            </div>

            {/* Legal */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Legal</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></p>
                <p><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></p>
                <p><Link href="/disclaimer" className="hover:text-white transition">Disclaimer</Link></p>
                {/* Google Play requires a publicly reachable account/data
                    deletion URL for any app that collects user data. The
                    page existed and was public, but was reachable only from
                    inside /account -- i.e. only after logging in, which is
                    the one thing a reviewer checking this cannot do. */}
                <p><Link href="/account/delete-info" className="hover:text-white transition">Delete My Data</Link></p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-8">
            {/* Disclaimers & Legal Section -- kept in full (this is real
                trust-building copy for a finance app) but toned down
                visually per Vince's Aug 23 2026 feedback: dropped the bold
                "Legal Disclaimer:" / "Important Notice:" / "Data Security:"
                lead-ins down to a muted, non-bold label so this whole block
                recedes instead of competing with the footer nav above it. */}
            <div className="space-y-4 mb-8">
              <div className="text-gray-600 text-[11px] leading-relaxed space-y-3">
                <p>
                  <span className="text-gray-500 font-medium">Legal Disclaimer.</span> Paycheck Planner is an independent financial management platform and is not affiliated with, endorsed by, or associated with any bank, lender, or third-party financial institution. We provide educational content and planning tools, not financial advice.
                </p>

                <p>
                  <span className="text-gray-500 font-medium">Important Notice.</span> Paycheck Planner does not provide financial, legal, or investment advice. Our tools are for informational and planning purposes only. Always consult with a licensed financial advisor before making major financial decisions. Past performance does not guarantee future results. All financial projections are estimates based on provided inputs and may not reflect actual outcomes.
                </p>

                <p>
                  <span className="text-gray-500 font-medium">Data Security.</span> Your financial data is protected with encryption in transit and at rest along with access controls. No online service is completely secure, and your information is never shared without your consent except as described in our Privacy Policy.
                </p>
              </div>

              {/* Copyright & Legal Ownership */}
              <div className="border-t border-gray-800 pt-6 text-gray-600 text-[11px] space-y-2 text-center">
                <p>
                  &copy; {new Date().getFullYear()} Paycheck Planner. All rights reserved.
                </p>
                <p>
                  <span className="font-medium">Legal Operator &amp; Property Owner.</span> DiBeasi Global Investments LLC, doing business as "Paycheck Planner". All intellectual property, trademarks, content, technology, and proprietary materials are the exclusive property of DiBeasi Global Investments LLC. Unauthorized use or reproduction is prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

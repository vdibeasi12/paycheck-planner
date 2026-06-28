/** @type {import('next').NextConfig} */

// Baseline security headers applied to every response. Kept conservative so
// nothing in the app (Stripe, Plaid Link, recharts, the Capacitor webview)
// breaks: the CSP only restricts framing (clickjacking) rather than scripts.
// HSTS is intentionally omitted here because Vercel sets it automatically on
// the custom domain.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
]

const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
// Server component (no "use client") so this renders straight into the
// initial HTML for crawlers -- no JS execution required to see it.
export default function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://paycheckplanner.ai/#organization",
        name: "Paycheck Planner",
        legalName: "DiBeasi Global Investments LLC",
        url: "https://paycheckplanner.ai",
        logo: "https://paycheckplanner.ai/logo.png",
      },
      {
        "@type": "WebSite",
        "@id": "https://paycheckplanner.ai/#website",
        url: "https://paycheckplanner.ai",
        name: "Paycheck Planner",
        publisher: { "@id": "https://paycheckplanner.ai/#organization" },
      },
      {
        "@type": "SoftwareApplication",
        name: "Paycheck Planner",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, iOS, Android",
        url: "https://paycheckplanner.ai",
        description:
          "Free AI-powered financial planning tools to eliminate debt, track bills, and achieve financial freedom. Compare debt payoff strategies and get personalized recommendations.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free plan with no card required",
        },
        publisher: { "@id": "https://paycheckplanner.ai/#organization" },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // Structured data must be inline JSON, not user input -- safe from XSS.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

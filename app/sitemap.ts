import type { MetadataRoute } from "next"

// Only genuinely public, indexable marketing pages belong here. Anything
// behind auth (see middleware.ts's PROTECTED list) or purely functional
// (auth flows, diagnostics) is deliberately left out -- a sitemap should
// point crawlers at content worth ranking, not just "everything reachable."
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://paycheckplanner.ai"
  const now = new Date()

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}

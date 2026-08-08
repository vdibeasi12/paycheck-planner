import type { Metadata } from "next"

export const metadata: Metadata = {
  alternates: {
    canonical: "/features",
  },
}

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

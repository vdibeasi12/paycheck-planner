import { redirect } from "next/navigation"

// Report was collapsed into a "Download PDF summary" action on the Payoff
// Plan page (Aug 13) -- this route stays only to forward old links/bookmarks
// instead of 404ing.
export default function ReportPage() {
  redirect("/amortization")
}

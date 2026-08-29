// lib/generateMarketingReport.ts
//
// Builds the admin portal's "marketing metrics" report as a CSV and a PDF,
// both generated client-side (no new API route) from the same data already
// loaded into app/admin/page.tsx's state -- metrics, visitors, funnels and
// events. That keeps the report in lockstep with what the dashboard shows:
// there is no second query path that could drift out of sync with the
// admin/users MRR fix (real, Stripe-backed, non-admin subscriptions only).
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export type ReportOverview = {
  totalUsers: number
  signups30: number
  activeSubs: number
  mrr: number
  paidUsers: number
  conversionPct: number
  canceledSubs: number
}

export type ReportCost = {
  gross: number
  stripeFees: number
  plaidCost: number
  net: number
  marginPct: number
  activeConnected: number
}

export type ReportShareRow = { label: string; count: number; pct: number }
export type ReportCtaRow = { cta: string; count: number }
export type ReportEventRow = { label: string; last30: number; allTime: number }
export type ReportFunnelStepRow = { label: string; count: number | null; pctOfPrev: number | null }
export type ReportSourceFunnelRow = {
  source: string
  visitors: number
  signups: number
  activated: number
  paid: number
  conversionPct: number | null
}
export type ReportCampaignRow = {
  campaign: string
  signups: number
  activated: number
  paid: number
  conversionPct: number | null
}
export type ReportVisitorTraffic = {
  visitorsToday: number
  visitors7d: number
  visitors30d: number
  pageViews30d: number
  pageViewsAllTime: number
}
export type ReportReferrals = {
  topReferrers: { email: string; count: number }[]
  completedTotal: number
  monthlyRevenue: number
}

export type MarketingReportData = {
  generatedAt: Date
  overview: ReportOverview
  cost: ReportCost
  planMix: ReportShareRow[]
  signupSources: ReportShareRow[]
  utmSources: ReportShareRow[]
  visitorTraffic: ReportVisitorTraffic | null
  visitorSources: ReportShareRow[]
  ctaClicks: ReportCtaRow[]
  marketingEvents: ReportEventRow[]
  productFunnel: ReportFunnelStepRow[]
  sourceFunnel: ReportSourceFunnelRow[]
  campaignFunnel: ReportCampaignRow[]
  referrals: ReportReferrals
}

function money(n: number): string {
  return "$" + Number(n || 0).toFixed(2)
}

function pct(n: number | null): string {
  return n === null ? "--" : n.toFixed(1) + "%"
}

function fileStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate())
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvEscape(v: string): string {
  if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\n") >= 0) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

function csvRow(cells: (string | number)[]): string {
  return cells.map((c) => csvEscape(String(c))).join(",")
}

export function downloadMarketingReportCsv(data: MarketingReportData) {
  const lines: string[] = []
  const section = (title: string) => {
    if (lines.length > 0) lines.push("")
    lines.push(csvEscape(title))
  }

  lines.push(csvEscape("Paycheck Planner - Marketing Report"))
  lines.push(csvRow(["Generated", data.generatedAt.toLocaleString()]))

  section("Overview")
  lines.push(csvRow(["Metric", "Value"]))
  lines.push(csvRow(["Total users", data.overview.totalUsers]))
  lines.push(csvRow(["New signups (30 days)", data.overview.signups30]))
  lines.push(csvRow(["Active subscriptions", data.overview.activeSubs]))
  lines.push(csvRow(["MRR", money(data.overview.mrr)]))
  lines.push(csvRow(["Paid users", data.overview.paidUsers]))
  lines.push(csvRow(["Free -> Paid conversion", pct(data.overview.conversionPct)]))
  lines.push(csvRow(["Canceled subscriptions", data.overview.canceledSubs]))

  section("Cost sheet (est. / mo)")
  lines.push(csvRow(["Metric", "Value"]))
  lines.push(csvRow(["Gross MRR", money(data.cost.gross)]))
  lines.push(csvRow(["Stripe fees", money(data.cost.stripeFees)]))
  lines.push(csvRow(["Plaid cost (" + data.cost.activeConnected + " Autopilot x $2.50)", money(data.cost.plaidCost)]))
  lines.push(csvRow(["Net", money(data.cost.net)]))
  lines.push(csvRow(["Net margin", pct(data.cost.marginPct)]))

  section("Plan mix")
  lines.push(csvRow(["Plan", "Users", "Percent"]))
  data.planMix.forEach((r) => lines.push(csvRow([r.label, r.count, pct(r.pct)])))

  section("Signup sources (self-reported)")
  lines.push(csvRow(["Source", "Users", "Percent"]))
  if (data.signupSources.length === 0) lines.push(csvRow(["No responses yet", "", ""]))
  data.signupSources.forEach((r) => lines.push(csvRow([r.label, r.count, pct(r.pct)])))

  section("Traffic sources (UTM, auto-detected)")
  lines.push(csvRow(["Source", "Users", "Percent"]))
  if (data.utmSources.length === 0) lines.push(csvRow(["No data yet", "", ""]))
  data.utmSources.forEach((r) => lines.push(csvRow([r.label, r.count, pct(r.pct)])))

  if (data.visitorTraffic) {
    section("Visitor traffic")
    lines.push(csvRow(["Metric", "Value"]))
    lines.push(csvRow(["Visitors today", data.visitorTraffic.visitorsToday]))
    lines.push(csvRow(["Visitors (7 days)", data.visitorTraffic.visitors7d]))
    lines.push(csvRow(["Visitors (30 days)", data.visitorTraffic.visitors30d]))
    lines.push(csvRow(["Page views (30 days)", data.visitorTraffic.pageViews30d]))
    lines.push(csvRow(["Page views (all-time)", data.visitorTraffic.pageViewsAllTime]))

    section("Visitors by source (30 days)")
    lines.push(csvRow(["Source", "Visitors", "Percent"]))
    if (data.visitorSources.length === 0) lines.push(csvRow(["No data yet", "", ""]))
    data.visitorSources.forEach((r) => lines.push(csvRow([r.label, r.count, pct(r.pct)])))

    section("Top CTA clicks (30 days)")
    lines.push(csvRow(["CTA", "Clicks"]))
    if (data.ctaClicks.length === 0) lines.push(csvRow(["No clicks tracked yet", ""]))
    data.ctaClicks.forEach((r) => lines.push(csvRow([r.cta, r.count])))
  }

  if (data.marketingEvents.length > 0) {
    section("Marketing and product events (last 30 days / all-time)")
    lines.push(csvRow(["Event", "Last 30 days", "All-time"]))
    data.marketingEvents.forEach((r) => lines.push(csvRow([r.label, r.last30, r.allTime])))
  }

  if (data.productFunnel.length > 0) {
    section("Product funnel")
    lines.push(csvRow(["Step", "Count", "Pct of previous step"]))
    data.productFunnel.forEach((r) =>
      lines.push(csvRow([r.label, r.count === null ? "--" : r.count, pct(r.pctOfPrev)]))
    )
  }

  if (data.sourceFunnel.length > 0) {
    section("Conversion by source")
    lines.push(csvRow(["Source", "Visitors (30d)", "Signups", "Activated", "Paid", "Conversion"]))
    data.sourceFunnel.forEach((r) =>
      lines.push(csvRow([r.source, r.visitors, r.signups, r.activated, r.paid, pct(r.conversionPct)]))
    )
  }

  if (data.campaignFunnel.length > 0) {
    section("Top campaigns")
    lines.push(csvRow(["Campaign", "Signups", "Activated", "Paid", "Conversion"]))
    data.campaignFunnel.forEach((r) =>
      lines.push(csvRow([r.campaign, r.signups, r.activated, r.paid, pct(r.conversionPct)]))
    )
  }

  section("Referrals")
  lines.push(csvRow(["Metric", "Value"]))
  lines.push(csvRow(["Referrals completed (all-time)", data.referrals.completedTotal]))
  lines.push(csvRow(["Est. monthly revenue from referrals", money(data.referrals.monthlyRevenue)]))
  if (data.referrals.topReferrers.length > 0) {
    lines.push("")
    lines.push(csvRow(["Top referrer", "Completed"]))
    data.referrals.topReferrers.forEach((r) => lines.push(csvRow([r.email, r.count])))
  }

  const csv = lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  triggerDownload(blob, "paycheck-planner-marketing-report-" + fileStamp(data.generatedAt) + ".csv")
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

type Doc = jsPDF & { lastAutoTable?: { finalY: number } }

function nextY(doc: Doc, fallback: number): number {
  return (doc.lastAutoTable?.finalY ?? fallback) + 8
}

const HEAD_STYLE = { fillColor: [16, 185, 129] as [number, number, number], textColor: 255 }
const MARGIN = { left: 14, right: 14 }

export function downloadMarketingReportPdf(data: MarketingReportData) {
  const doc = new jsPDF() as Doc
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text("Marketing Report", 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(120, 130, 145)
  doc.text("Paycheck Planner - Admin portal", 14, 27)
  doc.text("Generated " + data.generatedAt.toLocaleString(), 14, 33)

  autoTable(doc, {
    startY: 40,
    theme: "plain",
    body: [
      ["Total users", String(data.overview.totalUsers)],
      ["New signups (30 days)", String(data.overview.signups30)],
      ["Active subscriptions", String(data.overview.activeSubs)],
      ["MRR", money(data.overview.mrr)],
      ["Paid users", String(data.overview.paidUsers)],
      ["Free -> Paid conversion", pct(data.overview.conversionPct)],
      ["Canceled subscriptions", String(data.overview.canceledSubs)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [71, 85, 105] }, 1: { halign: "right" } },
    styles: { fontSize: 10, cellPadding: 2 },
    tableWidth: pageW - 28,
    margin: MARGIN,
  })

  autoTable(doc, {
    startY: nextY(doc, 40),
    head: [["Cost sheet (est. / mo)", ""]],
    body: [
      ["Gross MRR", money(data.cost.gross)],
      ["Stripe fees", "- " + money(data.cost.stripeFees)],
      ["Plaid (" + data.cost.activeConnected + " Autopilot x $2.50)", "- " + money(data.cost.plaidCost)],
      ["Net", money(data.cost.net)],
      ["Net margin", pct(data.cost.marginPct)],
    ],
    headStyles: HEAD_STYLE,
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 9 },
    margin: MARGIN,
  })

  autoTable(doc, {
    startY: nextY(doc, 40),
    head: [["Plan", "Users", "Percent"]],
    body: data.planMix.map((r) => [r.label, String(r.count), pct(r.pct)]),
    headStyles: HEAD_STYLE,
    styles: { fontSize: 9 },
    margin: MARGIN,
  })

  autoTable(doc, {
    startY: nextY(doc, 40),
    head: [["Signup source (self-reported)", "Users", "Percent"]],
    body:
      data.signupSources.length > 0
        ? data.signupSources.map((r) => [r.label, String(r.count), pct(r.pct)])
        : [["No responses yet", "", ""]],
    headStyles: HEAD_STYLE,
    styles: { fontSize: 9 },
    margin: MARGIN,
  })

  autoTable(doc, {
    startY: nextY(doc, 40),
    head: [["Traffic source (UTM, auto-detected)", "Users", "Percent"]],
    body:
      data.utmSources.length > 0
        ? data.utmSources.map((r) => [r.label, String(r.count), pct(r.pct)])
        : [["No data yet", "", ""]],
    headStyles: HEAD_STYLE,
    styles: { fontSize: 9 },
    margin: MARGIN,
  })

  if (data.visitorTraffic) {
    const vt = data.visitorTraffic
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Visitor traffic", ""]],
      body: [
        ["Visitors today", String(vt.visitorsToday)],
        ["Visitors (7 days)", String(vt.visitors7d)],
        ["Visitors (30 days)", String(vt.visitors30d)],
        ["Page views (30 days)", String(vt.pageViews30d)],
        ["Page views (all-time)", String(vt.pageViewsAllTime)],
      ],
      headStyles: HEAD_STYLE,
      columnStyles: { 1: { halign: "right" } },
      styles: { fontSize: 9 },
      margin: MARGIN,
    })

    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Visitors by source (30 days)", "Visitors", "Percent"]],
      body:
        data.visitorSources.length > 0
          ? data.visitorSources.map((r) => [r.label, String(r.count), pct(r.pct)])
          : [["No data yet", "", ""]],
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })

    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Top CTA clicks (30 days)", "Clicks"]],
      body:
        data.ctaClicks.length > 0
          ? data.ctaClicks.map((r) => [r.cta, String(r.count)])
          : [["No clicks tracked yet", ""]],
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  if (data.marketingEvents.length > 0) {
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Marketing / product event", "Last 30 days", "All-time"]],
      body: data.marketingEvents.map((r) => [r.label, String(r.last30), String(r.allTime)]),
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  if (data.productFunnel.length > 0) {
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Product funnel step", "Count", "Pct of previous"]],
      body: data.productFunnel.map((r) => [r.label, r.count === null ? "--" : String(r.count), pct(r.pctOfPrev)]),
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  if (data.sourceFunnel.length > 0) {
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Source", "Visitors (30d)", "Signups", "Activated", "Paid", "Conversion"]],
      body: data.sourceFunnel.map((r) => [
        r.source,
        String(r.visitors),
        String(r.signups),
        String(r.activated),
        String(r.paid),
        pct(r.conversionPct),
      ]),
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  if (data.campaignFunnel.length > 0) {
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Campaign", "Signups", "Activated", "Paid", "Conversion"]],
      body: data.campaignFunnel.map((r) => [
        r.campaign,
        String(r.signups),
        String(r.activated),
        String(r.paid),
        pct(r.conversionPct),
      ]),
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  autoTable(doc, {
    startY: nextY(doc, 40),
    head: [["Referrals", ""]],
    body: [
      ["Referrals completed (all-time)", String(data.referrals.completedTotal)],
      ["Est. monthly revenue from referrals", money(data.referrals.monthlyRevenue)],
    ],
    headStyles: HEAD_STYLE,
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 9 },
    margin: MARGIN,
  })

  if (data.referrals.topReferrers.length > 0) {
    autoTable(doc, {
      startY: nextY(doc, 40),
      head: [["Top referrer", "Completed"]],
      body: data.referrals.topReferrers.map((r) => [r.email, String(r.count)]),
      headStyles: HEAD_STYLE,
      styles: { fontSize: 9 },
      margin: MARGIN,
    })
  }

  // Footer + page numbers on every page.
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 160, 175)
    doc.text(
      "Paycheck Planner - admin only - marketing report",
      14,
      doc.internal.pageSize.getHeight() - 10
    )
    doc.text(
      "Page " + i + " of " + pageCount,
      pageW - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" }
    )
  }

  doc.save("paycheck-planner-marketing-report-" + fileStamp(data.generatedAt) + ".pdf")
}

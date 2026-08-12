// lib/generatePayoffPlanPdf.ts
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency } from "@/lib/i18n/formatCurrency"

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png")
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export type PayoffOrderRow = {
  rank: number
  name: string
  payoffLabel: string
  totalInterest: number
}

export type MonthlyScheduleRow = {
  month: number
  label: string
  startBalance: number
  payment: number
  interest: number
  principal: number
  endBalance: number
}

export async function generatePayoffPlanPdf(params: {
  strategy: "snowball" | "avalanche"
  avalancheCriterion?: "balance" | "rate"
  extra: number
  currency: string
  locale: string
  debtFreeLabel: string
  durationText: string
  totalInterest: number
  totalPaid: number
  payoffOrder: PayoffOrderRow[]
  monthlyRows: MonthlyScheduleRow[]
}) {
  const {
    strategy,
    avalancheCriterion,
    extra,
    currency,
    locale,
    debtFreeLabel,
    durationText,
    totalInterest,
    totalPaid,
    payoffOrder,
    monthlyRows,
  } = params

  const money = (n: number) => formatCurrency(Number(n || 0), currency, locale)
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()

  const strategyLabel =
    strategy === "snowball"
      ? "Snowball (smallest balance first)"
      : avalancheCriterion === "rate"
      ? "Avalanche (highest interest rate first)"
      : "Avalanche (biggest balance first)"

  const footer = () => {
    doc.setFontSize(8)
    doc.setTextColor(150, 160, 175)
    doc.text(
      "Paycheck Planner \u2014 a product of DiBeasi Global Investment LLC \u00b7 support@paycheckplanner.ai",
      14,
      doc.internal.pageSize.getHeight() - 10
    )
  }

  // Header: logo + title
  const logo = await logoDataUrl()
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, 12, 42, 16)
    } catch {
      /* ignore bad image */
    }
  }
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text("Payoff Plan", 14, 40)
  doc.setFontSize(10)
  doc.setTextColor(120, 130, 145)
  doc.text("Generated " + new Date().toLocaleString(), 14, 47)
  doc.text(
    "Strategy: " +
      strategyLabel +
      (extra > 0 ? "  \u00b7  Extra monthly payment: " + money(extra) : ""),
    14,
    53
  )

  const headStyle = { fillColor: [16, 185, 129] as [number, number, number], textColor: 255 }

  // Summary band
  autoTable(doc, {
    startY: 60,
    theme: "plain",
    body: [
      ["Debt-free", debtFreeLabel + " (" + durationText + ")"],
      ["Total interest", money(totalInterest)],
      ["Total paid", money(totalPaid)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [71, 85, 105] }, 1: { halign: "right" } },
    styles: { fontSize: 11, cellPadding: 2 },
    tableWidth: pageW - 28,
    margin: { left: 14, right: 14 },
  })

  // Payoff order
  if (payoffOrder.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable is added by the plugin at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["#", "Debt", "Paid off", "Interest paid"]],
      body: payoffOrder.map((d) => [String(d.rank), d.name, d.payoffLabel, money(d.totalInterest)]),
      headStyles: headStyle,
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })
  }

  // Monthly schedule (paginates automatically for long plans)
  if (monthlyRows.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable added at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["#", "Date", "Start", "Payment", "Interest", "Principal", "End"]],
      body: monthlyRows.map((r) => [
        String(r.month),
        r.label,
        money(r.startBalance),
        money(r.payment),
        money(r.interest),
        money(r.principal),
        money(r.endBalance),
      ]),
      headStyles: headStyle,
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14, bottom: 16 },
      didDrawPage: footer,
    })
  } else {
    footer()
  }

  doc.save("payoff-plan-" + strategy + ".pdf")
}
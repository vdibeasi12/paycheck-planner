// lib/generateBillsDebtsPdf.ts
// PDF export for the /bills-debts page (Sep 4 2026, Vince: "there should be
// a PDF and csv download on this page to review what you have"). Takes the
// already-computed obligation list straight from the page instead of
// re-querying Supabase, so the PDF always matches exactly what's on screen
// -- same pattern jsPDF + jspdf-autotable already established in
// lib/generateSummaryPdf.ts.

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency } from "@/lib/i18n/formatCurrency"

export type PdfObligationRow = {
  name: string
  type: "bill" | "debt"
  amount: number
  due_date: number | null
  status: string // "Overdue" | "Due today" | "Due in Nd" | "Upcoming" | "No due date"
}

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

export async function generateBillsDebtsPdf(
  rows: PdfObligationRow[],
  currency: string = "USD",
  locale: string = "en-US"
) {
  const money = (n: number) => formatCurrency(Number(n || 0), currency, locale)
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()

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
  doc.text("Bills & Debts", 14, 40)
  doc.setFontSize(10)
  doc.setTextColor(120, 130, 145)
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 47)

  const bills = rows.filter((r) => r.type === "bill")
  const debts = rows.filter((r) => r.type === "debt")
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  autoTable(doc, {
    startY: 54,
    theme: "plain",
    body: [
      ["Bills", String(bills.length)],
      ["Debts", String(debts.length)],
      ["Combined monthly total", money(total)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [71, 85, 105] }, 1: { halign: "right" } },
    styles: { fontSize: 11, cellPadding: 2 },
    tableWidth: pageW - 28,
    margin: { left: 14, right: 14 },
  })

  const headStyle = { fillColor: [16, 185, 129] as [number, number, number], textColor: 255 }

  if (rows.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable is added by the plugin at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Item", "Type", "Amount", "Due", "Status"]],
      body: rows.map((r) => [
        r.name || "—",
        r.type === "bill" ? "Bill" : "Debt",
        money(Number(r.amount)),
        r.due_date ? `Day ${r.due_date}` : "—",
        r.status,
      ]),
      headStyles: headStyle,
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 160, 175)
  doc.text(
    "Paycheck Planner — a product of DiBeasi Global Investment LLC · support@paycheckplanner.ai",
    14,
    doc.internal.pageSize.getHeight() - 10
  )

  doc.save("bills-and-debts.pdf")
}

// lib/generateSummaryPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase/client";

const money = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateSummaryPdf() {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header: logo + title
  const logo = await logoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, 12, 42, 16);
    } catch {
      /* ignore bad image */
    }
  }
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("Financial Summary", 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 145);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 47);

  // Pull data
  const [debtsRes, goalsRes, billsRes, assetsRes] = await Promise.all([
    supabase.from("debts").select("name, balance, interest_rate, minimum_payment, status"),
    supabase.from("financial_goals").select("title, target_amount, current_amount, status"),
    supabase.from("bills").select("name, amount, category, status"),
    supabase.from("assets").select("name, asset_type, value"),
  ]);

  const debts = debtsRes.data || [];
  const goals = goalsRes.data || [];
  const bills = billsRes.data || [];
  const assets = assetsRes.data || [];

  const totalDebt = debts.reduce((s, d) => s + Number(d.balance || 0), 0);
  const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
  const netWorth = totalAssets - totalDebt;

  // Net worth summary band
  autoTable(doc, {
    startY: 54,
    theme: "plain",
    body: [
      ["Total assets", money(totalAssets)],
      ["Total debt", money(totalDebt)],
      ["Net worth", money(netWorth)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [71, 85, 105] }, 1: { halign: "right" } },
    styles: { fontSize: 11, cellPadding: 2 },
    tableWidth: pageW - 28,
    margin: { left: 14, right: 14 },
  });

  const headStyle = { fillColor: [16, 185, 129] as [number, number, number], textColor: 255 };

  // Debts
  if (debts.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable is added by the plugin at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Debt", "Balance", "Rate", "Min. payment"]],
      body: debts.map((d) => [
        d.name || "—",
        money(Number(d.balance)),
        d.interest_rate != null ? `${d.interest_rate}%` : "—",
        money(Number(d.minimum_payment)),
      ]),
      headStyles: headStyle,
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Goals
  if (goals.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable added at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Goal", "Target", "Saved", "Progress"]],
      body: goals.map((g) => {
        const tgt = Number(g.target_amount || 0);
        const cur = Number(g.current_amount || 0);
        const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
        return [g.title || "—", money(tgt), money(cur), `${pct}%`];
      }),
      headStyles: headStyle,
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Bills
  if (bills.length) {
    autoTable(doc, {
      // @ts-ignore lastAutoTable added at runtime
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Bill", "Category", "Amount"]],
      body: bills.map((b) => [b.name || "—", b.category || "—", money(Number(b.amount))]),
      headStyles: headStyle,
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 175);
  doc.text(
    "Paycheck Planner — a product of DiBeasi Global Investment LLC · support@paycheckplanner.ai",
    14,
    doc.internal.pageSize.getHeight() - 10
  );

  doc.save("paycheck-planner-summary.pdf");
}

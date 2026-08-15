// lib/pdfToImages.ts
// Renders pages of a PDF to JPEG images client-side via pdf.js. Shared by
// app/components/SmartCapture.tsx (single-page bills/paystubs/statements --
// a photo or a one-page PDF works the same way) and app/import/page.tsx's
// PDF bank-statement import (a real bank statement is usually several
// pages, and every page needs to reach Claude for a full transaction list
// -- rendering only page 1 would silently drop most of a statement).

export type PageImage = { data: string; mediaType: string }

// Bounds request size/cost/latency for an unusually long statement. Statement
// PDFs run a handful of pages in practice; 12 comfortably covers a normal
// monthly statement with room to spare.
export const MAX_STATEMENT_PAGES = 12

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
  return pdfjsLib
}

async function renderPageToJpeg(page: any): Promise<PageImage> {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement("canvas")
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("PDF render: could not create canvas context")

  await page.render({ canvasContext: ctx, canvas, viewport }).promise

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
  const commaIdx = dataUrl.indexOf(",")
  return { data: dataUrl.slice(commaIdx + 1), mediaType: "image/jpeg" }
}

/** Renders just page 1 -- what SmartCapture needs for a single-page bill/paystub/photo-equivalent PDF. */
export async function pdfFirstPageToJpeg(file: File): Promise<PageImage> {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  return renderPageToJpeg(page)
}

/** Renders every page (up to maxPages) -- what a multi-page bank statement import needs. */
export async function pdfAllPagesToJpegs(
  file: File,
  maxPages: number = MAX_STATEMENT_PAGES
): Promise<{ pages: PageImage[]; totalPages: number; truncated: boolean }> {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = Math.min(pdf.numPages, maxPages)

  const pages: PageImage[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    pages.push(await renderPageToJpeg(page))
  }

  return { pages, totalPages: pdf.numPages, truncated: pdf.numPages > maxPages }
}

"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Upload, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import { pdfFirstPageToJpeg } from "@/lib/pdfToImages"
import {
  setCapturePrefill,
  pathForCapturedType,
  CAPTURED_TYPE_LABEL,
  type CapturedDocType,
} from "@/lib/capturePrefill"

type DocType = "bill" | "debt" | "income"

type BillFields = { name: string | null; amount: number | null; dueDate: string | null }
type DebtFields = {
  name: string | null
  balance: number | null
  interest_rate: number | null
  minimum_payment: number | null
}
type IncomeDetails = {
  grossPay: number | null
  federalTax: number | null
  stateTax: number | null
  socialSecurity: number | null
  medicare: number | null
  retirement401k: number | null
  healthInsurance: number | null
  otherDeductions: number | null
  netPay: number | null
}
type IncomeFields = {
  name: string | null
  amount: number | null
  frequency: string | null
  details: IncomeDetails | null
}

type ExtractedFields<T extends DocType> = T extends "bill"
  ? BillFields
  : T extends "debt"
  ? DebtFields
  : IncomeFields

const DOC_TYPE_LABEL: Record<DocType, string> = { bill: "Bill", debt: "Debt", income: "Income" }

export default function SmartCapture<T extends DocType>({
  docType,
  onExtracted,
}: {
  docType: T
  onExtracted: (fields: ExtractedFields<T>) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // QA fix (Aug 15 2026): "make sure the app reads the imported docs and
  // places it in the correct location -- if Netflix is uploaded into Debt
  // it should populate in Bills, if a credit card statement is uploaded in
  // Bills it should move to Debt." app/api/extract-document now always
  // classifies the document for itself before extracting -- this holds the
  // outcome when that classification disagrees with the page the user
  // scanned from, so they can jump to the right page with the fields
  // already filled in (lib/capturePrefill.ts) instead of losing the scan.
  const [mismatch, setMismatch] = useState<{ detectedType: CapturedDocType; fields: unknown } | null>(null)
  const [isStatement, setIsStatement] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // result is a data URL like "data:image/jpeg;base64,AAAA..." -- strip the prefix.
        const commaIdx = result.indexOf(",")
        resolve({ data: result.slice(commaIdx + 1), mediaType: file.type || "image/jpeg" })
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  function goToCorrectPage() {
    if (!mismatch) return
    setCapturePrefill(mismatch.detectedType, mismatch.fields)
    router.push(pathForCapturedType(mismatch.detectedType))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setError(null)
    setMismatch(null)
    setIsStatement(false)
    setBusy(true)
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      const { data, mediaType } = isPdf ? await pdfFirstPageToJpeg(file) : await fileToBase64(file)

      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mediaType, docType }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.success) {
        setError(json?.error || "Couldn't read that file. Please try again or enter details manually.")
        return
      }

      const detectedType: string = json.detectedType

      if (detectedType === "statement") {
        setIsStatement(true)
        return
      }
      if (detectedType === "unknown") {
        setError("Couldn't tell what kind of document that is. Please enter the details manually.")
        return
      }
      if (detectedType !== docType) {
        // Recognized, just not what this page expects -- offer the jump
        // instead of forcing it through the wrong schema.
        setMismatch({ detectedType: detectedType as CapturedDocType, fields: json.fields })
        return
      }

      onExtracted(json.fields as ExtractedFields<T>)
    } catch (err) {
      console.error("SmartCapture error:", err)
      const isPdfError = err instanceof Error && err.message.startsWith("PDF render:")
      setError(
        isPdfError
          ? "Couldn't read that PDF. Try a clearer scan or a photo instead."
          : "Couldn't reach the document scanner. Check your connection and try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-green-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {busy ? "Scanning…" : "Take photo"}
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-[#1a233a] disabled:opacity-60"
        >
          <Upload size={16} /> Upload photo or PDF
        </button>

        {/* `capture` opens the camera directly on phones / Capacitor -- a camera can't produce a PDF, so this stays image-only. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {docType === "bill"
          ? "Snap a photo or upload a PDF of the bill and we'll fill in the name, amount, and due date for you to review."
          : docType === "debt"
          ? "Snap a photo or upload a PDF of the statement and we'll fill in the name, balance, APR, and minimum payment for you to review."
          : "Snap a photo or upload a PDF of your paycheck stub and we'll fill in the employer, amount, and pay frequency for you to review."}
      </p>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-400">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {mismatch && (
        <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">
          <p>
            That looks like <span className="font-semibold">{CAPTURED_TYPE_LABEL[mismatch.detectedType]}</span>, not{" "}
            {DOC_TYPE_LABEL[docType]}. We kept what we found -- add it in the right place instead?
          </p>
          <button
            type="button"
            onClick={goToCorrectPage}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Go to {CAPTURED_TYPE_LABEL[mismatch.detectedType]} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {isStatement && (
        <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">
          <p>
            That looks like a full bank statement with multiple transactions, not a single {DOC_TYPE_LABEL[docType].toLowerCase()}.
          </p>
          <button
            type="button"
            onClick={() => router.push("/import")}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Import bank statement instead <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

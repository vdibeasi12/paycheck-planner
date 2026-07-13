"use client"

import { useRef, useState } from "react"
import { Camera, Upload, Loader2, AlertCircle } from "lucide-react"

type DocType = "bill" | "debt" | "income"

type BillFields = { name: string | null; amount: number | null; dueDate: string | null }
type DebtFields = {
  name: string | null
  balance: number | null
  interest_rate: number | null
  minimum_payment: number | null
}
type IncomeFields = { name: string | null; amount: number | null; frequency: string | null }

type ExtractedFields<T extends DocType> = T extends "bill"
  ? BillFields
  : T extends "debt"
  ? DebtFields
  : IncomeFields

export default function SmartCapture<T extends DocType>({
  docType,
  onExtracted,
}: {
  docType: T
  onExtracted: (fields: ExtractedFields<T>) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setError(null)
    setBusy(true)
    try {
      const { data, mediaType } = await fileToBase64(file)

      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mediaType, docType }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.success) {
        setError(json?.error || "Couldn't read that photo. Please try again or enter details manually.")
        return
      }

      onExtracted(json.fields as ExtractedFields<T>)
    } catch (err) {
      console.error("SmartCapture error:", err)
      setError("Couldn't reach the photo scanner. Check your connection and try again.")
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
          <Upload size={16} /> Upload photo
        </button>

        {/* `capture` opens the camera directly on phones / Capacitor. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input ref={uploadRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {docType === "bill"
          ? "Snap a photo of the bill and we'll fill in the name, amount, and due date for you to review."
          : docType === "debt"
          ? "Snap a photo of the statement and we'll fill in the name, balance, APR, and minimum payment for you to review."
          : "Snap a photo of your paycheck stub and we'll fill in the employer, amount, and pay frequency for you to review."}
      </p>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-400">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  )
}

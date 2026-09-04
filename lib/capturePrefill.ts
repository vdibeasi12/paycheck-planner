// lib/capturePrefill.ts
// Cross-page handoff for SmartCapture's auto-routing (see
// app/components/SmartCapture.tsx). When a scanned document turns out to be
// a different kind of record than the page it was scanned on expected --
// e.g. a Netflix receipt scanned from the Debts page, or a credit card
// statement scanned from the Bills page -- SmartCapture stores the
// correctly-extracted fields here and sends the user to the right page,
// which reads them back on mount and pre-fills its Add form exactly as if
// the user had scanned it there directly instead of losing that work.
//
// sessionStorage (not localStorage) is deliberate: this is a one-time,
// same-tab handoff for the page navigation that's about to happen, not
// something that should persist across sessions or leak into a new tab.
export type CapturedDocType = "bill" | "debt" | "income"

const KEY = "pp_capture_prefill"

export function setCapturePrefill(detectedType: CapturedDocType, fields: unknown) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ detectedType, fields }))
  } catch {
    // Best-effort convenience, not a requirement -- some locked-down browser
    // contexts (certain private-browsing modes) throw on sessionStorage
    // access. Losing the prefill just means the user re-enters the amount
    // on the destination page instead of it being pre-filled for them.
  }
}

/** Returns and clears the pending prefill if it matches the page asking for it; null otherwise. */
export function consumeCapturePrefill(expectedType: CapturedDocType): any | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.detectedType !== expectedType) return null
    return parsed.fields ?? null
  } catch {
    return null
  }
}

const TARGET_PATH: Record<CapturedDocType, string> = {
  bill: "/bills-debts",
  debt: "/bills-debts",
  income: "/income",
}

export function pathForCapturedType(type: CapturedDocType): string {
  return TARGET_PATH[type]
}

export const CAPTURED_TYPE_LABEL: Record<CapturedDocType, string> = {
  bill: "Bill",
  debt: "Debt",
  income: "Income",
}

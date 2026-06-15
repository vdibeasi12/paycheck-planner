// lib/useSafeArray.ts
"use client"

import { useMemo } from "react"

export function useSafeArray<T>(value: T[] | null | undefined): T[] {
  return useMemo(() => (Array.isArray(value) ? value : []), [value])
}

export default useSafeArray

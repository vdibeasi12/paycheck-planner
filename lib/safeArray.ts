// lib/safeArray.ts
// Guarantees an array so .map / .reduce / .length never throw on null/undefined.

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export default safeArray

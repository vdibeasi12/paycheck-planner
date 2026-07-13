export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual"

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Clamps a day-of-month to whatever the last real day of that month actually is
// (e.g. day 31 in February becomes 28 or 29).
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(day, lastDay)
}

/**
 * Returns every occurrence (as 'YYYY-MM-DD' strings) of a recurring item that
 * falls within the given calendar month, projected from a single anchor date.
 *
 * - weekly/biweekly: recur every 7 or 14 days from the anchor, regardless of
 *   calendar-month boundaries.
 * - monthly/quarterly/annual: recur on the same day-of-month (clamped for
 *   short months) every 1/3/12 months from the anchor.
 *
 * `month` is 0-indexed to match JS Date's convention.
 */
export function occurrencesInMonth(
  anchorDate: string | null | undefined,
  frequency: Frequency,
  year: number,
  month: number
): string[] {
  if (!anchorDate) return []
  const anchor = new Date(anchorDate + "T00:00:00")
  if (isNaN(anchor.getTime())) return []

  if (frequency === "weekly" || frequency === "biweekly") {
    const intervalDays = frequency === "weekly" ? 7 : 14
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)

    let current: Date
    if (anchor <= monthStart) {
      const stepsNeeded = Math.ceil((monthStart.getTime() - anchor.getTime()) / (intervalDays * MS_PER_DAY))
      current = new Date(anchor.getTime() + stepsNeeded * intervalDays * MS_PER_DAY)
    } else {
      current = new Date(anchor)
      while (current > monthStart) {
        const prev = new Date(current.getTime() - intervalDays * MS_PER_DAY)
        if (prev < monthStart) break
        current = prev
      }
    }

    const results: string[] = []
    while (current <= monthEnd) {
      if (current >= monthStart) results.push(toISODate(current))
      current = new Date(current.getTime() + intervalDays * MS_PER_DAY)
    }
    return results
  }

  // monthly / quarterly / annual: same day-of-month, every N months.
  const stepMonths = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12
  const anchorDay = anchor.getDate()
  const anchorMonthIndex = anchor.getFullYear() * 12 + anchor.getMonth()
  const targetMonthIndex = year * 12 + month

  const diffMonths = targetMonthIndex - anchorMonthIndex
  if (diffMonths < 0) return []
  if (diffMonths % stepMonths !== 0) return []

  const day = clampDay(year, month, anchorDay)
  return [toISODate(new Date(year, month, day))]
}

/**
 * Same idea for bills, which only ever have a day-of-month (no anchor date
 * needed) and always recur monthly today.
 */
export function billOccurrenceInMonth(dueDay: number, year: number, month: number): string {
  const day = clampDay(year, month, dueDay)
  return toISODate(new Date(year, month, day))
}

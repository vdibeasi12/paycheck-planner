// lib/paycheckSnapshot.ts
//
// The four numbers the dashboard's first screen is built from, and the
// guarantee that they add up.
//
// Sep 12 2026, Vince, pointing at the phone mockup on the marketing homepage:
// "it looks really sleek, can the actual app look like this?" That mockup is a
// sentence -- money in, where it goes, what is left -- and the dashboard was a
// wall of about twenty independent widgets. This builds the sentence.
//
// The one thing that must not happen while doing it is inventing a second way
// to compute money. This codebase's recurring failure has been two places
// deriving almost-the-same figure and quietly disagreeing, so this file
// derives NOTHING new. lib/paycheckCycles.ts already documents the exact
// identity behind Safe to Spend:
//
//     startingCash + incomeThroughLowest - outflowThroughLowest === safeToSpend
//
// which is already the sentence the mockup tells. All this adds is splitting
// that single outflow figure into bills / debt payments / transfers so the
// card can show WHERE the money goes rather than one lump.
//
// That split is read back off the timeline the engine already produced, not
// recomputed:
//
//   * `billsDue`/`debtsDue` on SafeToSpendResult look like the obvious source
//     and are the wrong one. They are measured over a DIFFERENT window (the
//     last paycheck through end of month) than outflowThroughLowest (today
//     through the projected low point), so `billsDue + debtsDue` does not
//     equal `outflowThroughLowest` and a card built from them would display a
//     breakdown that does not sum to its own headline.
//
//   * The low point is an INDEX into the sorted event list, not a date --
//     same-day events apply outflows before income, so "every event on
//     lowestDate" is not the same set. lowestIndex() below recovers the
//     engine's own boundary by finding where the running balance first
//     touches lowestBalance.
//
// And it is checked rather than trusted: if the per-kind sums do not reproduce
// the engine's own incomeThroughLowest/outflowThroughLowest to the cent,
// `reconciles` comes back false and the card shows the total without a
// breakdown. A missing breakdown is a small disappointment; a breakdown whose
// parts do not add up to the number above them destroys trust in every figure
// on the page.

import type { SafeToSpendResult } from "./safeToSpend"
import type { BalanceTimeline } from "./paycheckCycles"

export type PaycheckSnapshot = {
  // What is actually in Checking today (or the projected paycheck when no
  // balance has been entered) -- the line the whole sentence starts from.
  onHand: number
  onHandSource: "lastPaycheck" | "checking"
  onHandAsOf: string | null

  // Pay landing between today and the low point.
  incoming: number

  // Obligations between today and the low point, split by kind. These three
  // sum to totalOut whenever `reconciles` is true.
  billsOut: number
  debtsOut: number
  transfersOut: number
  totalOut: number

  // The headline. Equals onHand + incoming - totalOut.
  safeToSpend: number

  // The tightest day, or null when today is as tight as it gets.
  lowestDate: string | null

  // False when the per-kind split could not be reproduced exactly. The card
  // must then show totalOut alone and no breakdown.
  reconciles: boolean
}

const CENT = 0.005

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Recover the engine's own low-point boundary. It tracks `balance < lowest`
// strictly, so the FIRST event whose running balance equals lowestBalance is
// the one it stopped at. Returns -1 when the low point is today (nothing
// scheduled ever dips below what is on hand), which is the same -1 the engine
// starts lowestIdx at and which correctly yields zero on both totals.
function lowestIndex(timeline: BalanceTimeline): number {
  if (timeline.lowestDate === null) return -1
  for (let i = 0; i < timeline.events.length; i++) {
    if (Math.abs(timeline.events[i].balanceAfter - timeline.lowestBalance) < CENT) return i
  }
  return -1
}

export function buildPaycheckSnapshot(result: SafeToSpendResult): PaycheckSnapshot | null {
  // Same guard every other Safe to Spend surface uses: with no income or no
  // pay date there is no projection to describe, and the card says so rather
  // than rendering zeroes that look like an answer.
  if (!result.hasIncome || result.missingPayDate) return null

  const base = {
    onHand: result.startingCash,
    onHandSource: result.startingCashSource,
    onHandAsOf: result.startingCashAsOf,
    incoming: result.incomeThroughLowest,
    totalOut: result.outflowThroughLowest,
    safeToSpend: result.safeToSpend,
    lowestDate: result.lowestDate,
  }

  const timeline = result.timeline
  if (!timeline) {
    return { ...base, billsOut: 0, debtsOut: 0, transfersOut: 0, reconciles: false }
  }

  const end = lowestIndex(timeline)
  let bills = 0
  let debts = 0
  let transfers = 0
  let income = 0
  for (let i = 0; i <= end; i++) {
    const e = timeline.events[i]
    if (e.kind === "income") income += e.delta
    else if (e.kind === "bill") bills += -e.delta
    else if (e.kind === "debt") debts += -e.delta
    else transfers += -e.delta
  }

  bills = round2(bills)
  debts = round2(debts)
  transfers = round2(transfers)
  income = round2(income)

  // Three independent checks, all of which must hold before the breakdown is
  // shown: the parts sum to the engine's outflow, the income agrees, and the
  // whole sentence still reproduces the headline. The third is the one that
  // actually protects the user -- the first two could both pass against a
  // stale result.
  const partsMatchOutflow = Math.abs(bills + debts + transfers - result.outflowThroughLowest) < CENT
  const incomeMatches = Math.abs(income - result.incomeThroughLowest) < CENT
  const sentenceHolds =
    Math.abs(result.startingCash + result.incomeThroughLowest - result.outflowThroughLowest - result.safeToSpend) < CENT

  const reconciles = partsMatchOutflow && incomeMatches && sentenceHolds

  if (!reconciles) {
    console.error("[paycheckSnapshot] breakdown did not reconcile; showing the total only", {
      bills,
      debts,
      transfers,
      outflowThroughLowest: result.outflowThroughLowest,
      income,
      incomeThroughLowest: result.incomeThroughLowest,
      startingCash: result.startingCash,
      safeToSpend: result.safeToSpend,
    })
  }

  return {
    ...base,
    billsOut: bills,
    debtsOut: debts,
    transfersOut: transfers,
    reconciles,
  }
}

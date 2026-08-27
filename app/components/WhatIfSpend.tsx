"use client"

import { useState } from "react"
import {
  Sparkles,
  Plus,
  X,
  ShoppingBag,
  ShoppingCart as CartIcon,
  ShoppingBasket,
  Coffee,
  Utensils,
  Car,
  Fuel,
  Film,
  Gamepad2,
  type LucideIcon,
} from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { whatIfSpend, type SafeToSpendResult, type WhatIfVerdict } from "@/lib/safeToSpend"

type Props = {
  result: SafeToSpendResult
}

type CartItem = {
  id: string
  name: string
  amount: number
}

// Common merchants/categories offered in the datalist so people don't have
// to type a full name -- typing anything else just adds it as a custom item.
const COMMON_ITEMS: { name: string; icon: LucideIcon }[] = [
  { name: "Amazon", icon: ShoppingBag },
  { name: "Target", icon: CartIcon },
  { name: "Walmart", icon: CartIcon },
  { name: "Groceries", icon: ShoppingBasket },
  { name: "Starbucks", icon: Coffee },
  { name: "DoorDash", icon: Utensils },
  { name: "Uber", icon: Car },
  { name: "Gas", icon: Fuel },
  { name: "Netflix", icon: Film },
  { name: "Steam", icon: Gamepad2 },
]

const ICON_BY_NAME = new Map(COMMON_ITEMS.map((item) => [item.name.toLowerCase(), item.icon]))

const VERDICT_COPY: Record<WhatIfVerdict, { label: string; className: string }> = {
  fine: { label: "That's fine.", className: "text-emerald-400" },
  tight: { label: "It'll be tight, but doable.", className: "text-amber-400" },
  "not-recommended": { label: "Not recommended.", className: "text-red-400" },
}

/**
 * "Financial shopping cart" -- lets someone stack up a few planned
 * purchases (pick a common merchant from the list or type their own) and
 * see the combined effect on Safe-to-Spend and the daily limit before
 * spending anything for real. Built on the same pure whatIfSpend() math
 * (lib/safeToSpend.ts) as the single-amount "Can I afford this?" check it
 * replaces -- a cart with one item in it is just that check. Nothing here
 * is a real transaction; the cart lives only in this component's state.
 */
export default function WhatIfSpend({ result }: Props) {
  const formatMoney = useFormatCurrency()
  const [cart, setCart] = useState<CartItem[]>([])
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")

  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) return null

  const parsedAmount = Number(amount)
  const canAdd = name.trim() !== "" && amount.trim() !== "" && !Number.isNaN(parsedAmount) && parsedAmount > 0

  function addItem() {
    if (!canAdd) return
    setCart((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, name: name.trim(), amount: parsedAmount }])
    setName("")
    setAmount("")
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.amount, 0)
  const outcome = cart.length > 0 ? whatIfSpend(result, cartTotal) : null
  const copy = outcome ? VERDICT_COPY[outcome.verdict] : null
  const stillDue = result.billsDue + result.debtsDue + result.goalContribution

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Financial shopping cart</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Add anything you&apos;re thinking about buying to see what it does to your Safe to Spend and daily limit
        before you buy it.
      </p>

      <datalist id="cart-merchant-options">
        {COMMON_ITEMS.map((item) => (
          <option key={item.name} value={item.name} />
        ))}
      </datalist>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          list="cart-merchant-options"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Amazon, Target, gas..."
          aria-label="Item or merchant"
          className="min-w-[10rem] flex-1 rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem()
            }}
            placeholder="0.00"
            aria-label="Amount"
            className="w-24 rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={!canAdd}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-[#06231b] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {cart.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
          {cart.map((item) => {
            const Icon = ICON_BY_NAME.get(item.name.toLowerCase()) ?? ShoppingBag
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-300">
                  <Icon size={15} />
                </span>
                <span className="flex-1 truncate text-sm text-gray-200">{item.name}</span>
                <span className="tabular-nums text-sm text-gray-300">{formatMoney(item.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={13} />
                </button>
              </li>
            )
          })}
          <li className="flex items-center justify-between py-2.5 text-sm font-semibold text-gray-200">
            <span>Cart total</span>
            <span className="tabular-nums">{formatMoney(cartTotal)}</span>
          </li>
        </ul>
      )}

      {outcome && copy && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className={`font-semibold ${copy.className}`}>{copy.label}</p>
            <p className="mt-1 text-sm text-gray-400">
              That changes your safe-to-spend from{" "}
              <span className="text-gray-200">{formatMoney(result.safeToSpend)}</span> to{" "}
              <span className={outcome.newSafeToSpend >= 0 ? "text-gray-200" : "text-red-400"}>
                {formatMoney(outcome.newSafeToSpend)}
              </span>{" "}
              until your next paycheck.
            </p>
          </div>

          {outcome.newDailyLimit != null && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span className="text-gray-400">
                New daily limit ({result.daysUntilNextPaycheck ?? 0}{" "}
                {result.daysUntilNextPaycheck === 1 ? "day" : "days"} left)
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  outcome.newDailyLimit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatMoney(outcome.newDailyLimit)}/day
              </span>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Still due before payday ({formatMoney(stillDue)}) is already factored into Safe to Spend -- it doesn&apos;t
            change as you add to the cart.
          </p>
        </div>
      )}
    </div>
  )
}

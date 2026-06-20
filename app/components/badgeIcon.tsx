"use client"

import {
  DollarSign,
  ListChecks,
  Receipt,
  CheckCircle2,
  CalendarCheck,
  Swords,
  PartyPopper,
  Target,
  TrendingDown,
  Flame,
  Award,
  Plane,
  Trophy,
  type LucideIcon,
} from "lucide-react"

const MAP: Record<string, LucideIcon> = {
  DollarSign,
  ListChecks,
  Receipt,
  CheckCircle2,
  CalendarCheck,
  Swords,
  PartyPopper,
  Target,
  TrendingDown,
  Flame,
  Award,
  Plane,
  Trophy,
}

export default function BadgeIcon({
  name,
  size = 20,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = MAP[name] || Trophy
  return <Icon size={size} className={className} />
}
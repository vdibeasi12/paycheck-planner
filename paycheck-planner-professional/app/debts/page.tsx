"use client"

import DebtFreedomCountdown from "@/components/DebtFreedomCountdown"
import DebtDestructionScore from "@/components/DebtDestructionScore"
import NetWorthTracker from "@/components/NetWorthTracker"
import PaycheckPlanner from "@/components/PaycheckPlanner"
import PaycheckBreakdownChart from "@/components/PaycheckBreakdownChart"
import DebtStrategyRace from "@/components/DebtStrategyRace"
import BudgetShockDetector from "@/components/BudgetShockDetector"
import InterestLeakDetector from "@/components/InterestLeakDetector"
import DebtProgress from "@/components/DebtProgress"
import DebtTable from "@/components/DebtTable"
import DebtPayoffTimelineChart from "@/components/DebtPayoffTimelineChart"
import AIPayoffStrategy from "@/components/AIPayoffStrategy"

export default function DashboardPage() {
return ( <div className="p-8 space-y-8 bg-gray-50 min-h-screen">

```
  <h1 className="text-3xl font-bold">
    Financial Dashboard
  </h1>

  {/* TOP METRICS */}

  <div className="grid md:grid-cols-3 gap-6">
    <DebtFreedomCountdown />
    <DebtDestructionScore />
    <NetWorthTracker />
  </div>

  {/* AI STRATEGY */}

  <AIPayoffStrategy />

  {/* PAYOFF TIMELINE */}

  <DebtPayoffTimelineChart />

  {/* BUDGET TOOLS */}

  <div className="grid md:grid-cols-2 gap-6">
    <PaycheckPlanner />
    <PaycheckBreakdownChart />
  </div>

  {/* STRATEGY TOOLS */}

  <DebtStrategyRace />

  {/* RISK ANALYSIS */}

  <div className="grid md:grid-cols-2 gap-6">
    <BudgetShockDetector />
    <InterestLeakDetector />
  </div>

  {/* PROGRESS TRACKING */}

  <DebtProgress />

  {/* DEBT TABLE */}

  <DebtTable />

</div>
```

)
}

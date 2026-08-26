import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import type { ScenarioResult, ScenarioVerdict } from "@/lib/planResilience"

type Props = {
  scenarioResults: ScenarioResult[]
}

const VERDICT_META: Record<ScenarioVerdict, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  survives: { label: "Survives", className: "text-emerald-400", Icon: CheckCircle2 },
  tight: { label: "Tight", className: "text-amber-400", Icon: AlertTriangle },
  breaks: { label: "Plan breaks", className: "text-red-400", Icon: XCircle },
}

/**
 * The fixed stress-test menu (lib/planResilience.ts's DEFAULT_SCENARIOS),
 * already run against every projected paycheck server-side. Each row's
 * verdict is the worst outcome across the tested paychecks -- "Plan breaks"
 * means at least one upcoming paycheck would go negative under that
 * scenario, not that every paycheck would.
 */
export default function StressTestPanel({ scenarioResults }: Props) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-1">Stress test</h2>
      <p className="text-sm text-gray-500 mb-4">How your plan holds up against common surprises.</p>
      <div className="space-y-1.5">
        {scenarioResults.map((r) => {
          const meta = VERDICT_META[r.worstVerdict]
          const Icon = meta.Icon
          return (
            <div
              key={r.scenario.label}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm bg-white/[0.02]"
            >
              <span className="text-gray-300">{r.scenario.label}</span>
              <span className={`flex items-center gap-1.5 font-medium ${meta.className}`}>
                <Icon size={15} />
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

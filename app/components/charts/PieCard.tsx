"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#34D399",
  "#2DD4BF",
  "#10B981",
  "#0EA5E9",
  "#6366F1",
  "#F59E0B",
  "#FB7185",
  "#A78BFA",
  "#F472B6",
  "#22D3EE",
];

export type Slice = { name: string; value: number };

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function PieCard({
  title,
  data,
  emptyHint,
}: {
  title: string;
  data: Slice[];
  emptyHint?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-white">{title}</h3>

      {data.length === 0 || total === 0 ? (
        <div className="flex h-56 items-center justify-center text-center text-sm text-gray-400">
          {emptyHint || "No data yet."}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => money(Number(v))}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-gray-400">Total</span>
              <span className="text-lg font-bold text-white">{money(total)}</span>
            </div>
          </div>

          <ul className="space-y-2">
            {data
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((d, i) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-300">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: COLORS[data.indexOf(d) % COLORS.length] }}
                    />
                    {d.name}
                  </span>
                  <span className="font-medium text-white">{money(d.value)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PieCard;

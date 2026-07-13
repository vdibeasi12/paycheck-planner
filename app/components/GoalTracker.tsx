"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { celebrate, popMilestone } from "@/lib/confetti";
import { Plus, Target, Trophy, Trash2, Loader2 } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number | null;
  deadline: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
};

const CATEGORIES = ["Emergency fund", "Debt payoff", "Savings", "Big purchase", "Other"];

function pct(g: Goal) {
  const cur = Number(g.current_amount ?? 0);
  const tgt = Number(g.target_amount || 0);
  if (tgt <= 0) return 0;
  return Math.min(100, Math.round((cur / tgt) * 100));
}

function crossedMilestone(before: number, after: number) {
  for (const m of [25, 50, 75]) if (before < m && after >= m) return true;
  return false;
}

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // new-goal form
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("financial_goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setGoals(data as Goal[]);
    setLoading(false);
  }

  async function addGoal() {
    setError(null);
    if (!title.trim() || !target) {
      setError("Add a title and target amount.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in.");
        return;
      }
      const { error: insErr } = await supabase.from("financial_goals").insert({
        user_id: user.id,
        title: title.trim(),
        target_amount: Number(target),
        current_amount: 0,
        category,
        deadline: deadline || null,
        status: "active",
      });
      if (insErr) {
        setError(insErr.message);
        return;
      }
      setTitle("");
      setTarget("");
      setDeadline("");
      setAdding(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function contribute(goal: Goal, raw: string) {
    const amount = Number(raw);
    if (!amount || amount <= 0) return;

    const before = pct(goal);
    const newCurrent = Number(goal.current_amount ?? 0) + amount;
    const completed = newCurrent >= Number(goal.target_amount);
    const after = Math.min(100, Math.round((newCurrent / Number(goal.target_amount)) * 100));

    // Optimistic update so the bar moves immediately
    setGoals((gs) =>
      gs.map((g) =>
        g.id === goal.id
          ? { ...g, current_amount: newCurrent, status: completed ? "completed" : "active" }
          : g
      )
    );

    if (completed) celebrate();
    else if (crossedMilestone(before, after)) popMilestone();

    await supabase
      .from("financial_goals")
      .update({
        current_amount: newCurrent,
        status: completed ? "completed" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", goal.id);
  }

  async function removeGoal(id: string) {
    setGoals((gs) => gs.filter((g) => g.id !== id));
    await supabase.from("financial_goals").delete().eq("id", id);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Loading your goals…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Target size={20} className="text-emerald-500" />
          <h2 className="text-lg font-semibold">Your goals</h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <Plus size={16} /> New goal
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-300">Goal</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. $1,000 emergency fund"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-300">Target amount</span>
              <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
                <span className="text-gray-300">$</span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  inputMode="decimal"
                  placeholder="1000"
                  className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-300">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-300">Target date (optional)</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={addGoal}
            disabled={busy}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Create goal
          </button>
        </div>
      )}

      {/* Goal list */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-[#0f172a] p-10 text-center">
          <Target size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-gray-400">
            No goals yet. Set your first one and watch the progress add up.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onContribute={contribute} onRemove={removeGoal} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onContribute,
  onRemove,
}: {
  goal: Goal;
  onContribute: (g: Goal, raw: string) => void;
  onRemove: (id: string) => void;
}) {
  const [amt, setAmt] = useState("");
  const progress = pct(goal);
  const done = progress >= 100;

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{goal.title}</h3>
            {done && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                <Trophy size={12} /> Reached
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {goal.category || "Goal"}
            {goal.deadline ? ` · by ${new Date(goal.deadline).toLocaleDateString()}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(goal.id)}
          className="rounded-lg p-2 text-gray-400 hover:bg-rose-500/10 hover:text-rose-400"
          aria-label="Delete goal"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-200">
            ${Number(goal.current_amount ?? 0).toLocaleString()} of $
            {Number(goal.target_amount).toLocaleString()}
          </span>
          <span className={`font-semibold ${done ? "text-emerald-600" : "text-gray-400"}`}>
            {progress}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1a233a]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add contribution */}
      {!done && (
        <div className="mt-4 flex gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
            <span className="text-gray-300">$</span>
            <input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              inputMode="decimal"
              placeholder="Add a contribution"
              className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onContribute(goal, amt);
              setAmt("");
            }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

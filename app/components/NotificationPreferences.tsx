"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Bell, Loader2, Check } from "lucide-react";

type Prefs = {
  email_bill_reminders: boolean;
  email_weekly_summary: boolean;
  email_product_updates: boolean;
  push_bill_reminders: boolean;
  reminder_days_before: number;
};

const DEFAULTS: Prefs = {
  email_bill_reminders: true,
  email_weekly_summary: false,
  email_product_updates: true,
  push_bill_reminders: false,
  reminder_days_before: 3,
};

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setPrefs(DEFAULTS);
        return;
      }
      const { data } = await supabase
        .from("notification_preferences")
        .select(
          "email_bill_reminders, email_weekly_summary, email_product_updates, push_bill_reminders, reminder_days_before"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      setPrefs(data ? { ...DEFAULTS, ...(data as Partial<Prefs>) } : DEFAULTS);
    })();
  }, []);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (!error) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Notifications</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Pick what you would like to receive. We will respect these as delivery rolls out.
      </p>

      {prefs === null ? (
        <div className="mt-4 flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : (
        <>
          <div className="mt-3 divide-y divide-gray-800">
            <Toggle
              label="Bill due-date reminders (email)"
              desc="Get an email before a bill is due."
              checked={prefs.email_bill_reminders}
              onChange={(v) => update("email_bill_reminders", v)}
            />
            <Toggle
              label="Bill reminders (push)"
              desc="A push notification on your phone."
              checked={prefs.push_bill_reminders}
              onChange={(v) => update("push_bill_reminders", v)}
            />
            <Toggle
              label="Weekly summary (email)"
              desc="A short recap of your week."
              checked={prefs.email_weekly_summary}
              onChange={(v) => update("email_weekly_summary", v)}
            />
            <Toggle
              label="Product updates and tips (email)"
              desc="Occasional news and how-tos."
              checked={prefs.email_product_updates}
              onChange={(v) => update("email_product_updates", v)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <label htmlFor="reminder_days" className="text-sm text-gray-300">
              Remind me this many days before a bill is due
            </label>
            <select
              id="reminder_days"
              value={prefs.reminder_days_before}
              onChange={(e) => update("reminder_days_before", Number(e.target.value))}
              className="rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
            </select>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save preferences
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <Check size={16} /> Saved
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-gray-600"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
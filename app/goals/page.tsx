import GoalTracker from "@/components/GoalTracker";

export default function GoalsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set targets, log your progress, and celebrate when you hit them.
        </p>
        <div className="mt-6">
          <GoalTracker />
        </div>
      </div>
    </div>
  );
}

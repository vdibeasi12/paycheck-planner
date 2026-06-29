import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremium } from "@/lib/permissions";
import DocumentCapture from "@/components/DocumentCapture";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  // Camera / document capture is an Accelerate+ feature. Admins act as the
  // connected tier everywhere.
  const effectivePlan = profile?.is_admin ? "connected" : (profile?.plan || "free");
  if (!isPremium(effectivePlan)) {
    redirect("/pricing");
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-white">Capture documents</h1>
        <p className="mt-1 text-sm text-gray-400">
          Snap a photo of a bill or paycheck, or upload an image or PDF. Everything is
          stored privately to your account.
        </p>
        <div className="mt-6">
          <DocumentCapture />
        </div>
      </div>
    </div>
  );
}
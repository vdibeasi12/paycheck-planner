warning: in the working copy of 'app/bills/page.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/documents/page.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/report/page.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/app/bills/page.tsx b/app/bills/page.tsx[m
[1mindex ec41eea..e1f7050 100644[m
[1m--- a/app/bills/page.tsx[m
[1m+++ b/app/bills/page.tsx[m
[36m@@ -4,6 +4,8 @@[m [mimport { useEffect, useState } from 'react'[m
 import { supabase } from '@/lib/supabase'[m
 import { Plus, Trash2, Upload } from 'lucide-react'[m
 import BillOCR from '../components/BillOCR'[m
[32m+[m[32mimport { useRouter } from 'next/navigation'[m
[32m+[m[32mimport { isPremium } from '@/lib/permissions'[m
 [m
 interface Bill {[m
   id: string[m
[36m@@ -20,11 +22,22 @@[m [mexport default function BillsPage() {[m
   const [dueDay, setDueDay] = useState('')[m
   const [showOCR, setShowOCR] = useState(false)[m
   const [loading, setLoading] = useState(true)[m
[32m+[m[32m  const [plan, setPlan] = useState('free')[m
[32m+[m[32m  const router = useRouter()[m
 [m
   async function loadBills() {[m
     try {[m
       const { data } = await supabase.from('bills').select('*')[m
       if (data) setBills(data)[m
[32m+[m[32m      const { data: auth } = await supabase.auth.getUser()[m
[32m+[m[32m      if (auth.user) {[m
[32m+[m[32m        const { data: profile } = await supabase[m
[32m+[m[32m          .from('profiles')[m
[32m+[m[32m          .select('plan')[m
[32m+[m[32m          .eq('id', auth.user.id)[m
[32m+[m[32m          .maybeSingle()[m
[32m+[m[32m        if (profile?.plan) setPlan(profile.plan)[m
[32m+[m[32m      }[m
     } catch (error) {[m
       console.error('Error loading bills:', error)[m
     } finally {[m
[36m@@ -166,7 +179,7 @@[m [mexport default function BillsPage() {[m
 [m
                 {/* OCR Option */}[m
                 <button[m
[31m-                  onClick={() => setShowOCR(true)}[m
[32m+[m[32m                  onClick={() => { if (isPremium(plan)) { setShowOCR(true) } else { router.push('/pricing') } }}[m
                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"[m
                 >[m
                   <Upload size={20} /> Upload Bill Image[m
[1mdiff --git a/app/documents/page.tsx b/app/documents/page.tsx[m
[1mindex 7f4ff45..a9337d2 100644[m
[1m--- a/app/documents/page.tsx[m
[1m+++ b/app/documents/page.tsx[m
[36m@@ -1,6 +1,26 @@[m
[32m+[m[32mimport { redirect } from "next/navigation";[m
[32m+[m[32mimport { createClient } from "@/lib/supabase/server";[m
[32m+[m[32mimport { isPremium } from "@/lib/permissions";[m
 import DocumentCapture from "@/components/DocumentCapture";[m
 [m
[31m-export default function DocumentsPage() {[m
[32m+[m[32mexport default async function DocumentsPage() {[m
[32m+[m[32m  const supabase = await createClient();[m
[32m+[m[32m  const {[m
[32m+[m[32m    data: { user },[m
[32m+[m[32m  } = await supabase.auth.getUser();[m
[32m+[m[32m  if (!user) {[m
[32m+[m[32m    redirect("/login");[m
[32m+[m[32m  }[m
[32m+[m[32m  const { data: profile } = await supabase[m
[32m+[m[32m    .from("profiles")[m
[32m+[m[32m    .select("plan")[m
[32m+[m[32m    .eq("id", user.id)[m
[32m+[m[32m    .maybeSingle();[m
[32m+[m[32m  // Camera / document capture is an Accelerate+ feature.[m
[32m+[m[32m  if (!isPremium(profile?.plan || "free")) {[m
[32m+[m[32m    redirect("/pricing");[m
[32m+[m[32m  }[m
[32m+[m
   return ([m
     <div className="min-h-screen bg-[#020617] p-6 md:p-10">[m
       <div className="mx-auto max-w-3xl">[m
[36m@@ -15,4 +35,4 @@[m [mexport default function DocumentsPage() {[m
       </div>[m
     </div>[m
   );[m
[31m-}[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/app/report/page.tsx b/app/report/page.tsx[m
[1mindex eec0be1..caf474c 100644[m
[1m--- a/app/report/page.tsx[m
[1m+++ b/app/report/page.tsx[m
[36m@@ -33,6 +33,17 @@[m [mexport default function ReportPage() {[m
         return[m
       }[m
 [m
[32m+[m[32m      // PDF reports & export is a Momentum+ feature.[m
[32m+[m[32m      const { data: profile } = await supabase[m
[32m+[m[32m        .from("profiles")[m
[32m+[m[32m        .select("plan")[m
[32m+[m[32m        .eq("id", user.id)[m
[32m+[m[32m        .maybeSingle()[m
[32m+[m[32m      if ((profile?.plan || "free") === "free") {[m
[32m+[m[32m        router.replace("/pricing")[m
[32m+[m[32m        return[m
[32m+[m[32m      }[m
[32m+[m
       const { data } = await supabase[m
         .from("debts")[m
         .select("*")[m

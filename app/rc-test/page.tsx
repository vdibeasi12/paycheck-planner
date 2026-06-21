"use client";

// TEMPORARY Phase-0 diagnostic. Validates that the RevenueCat native plugin is
// reachable over the Capacitor bridge from the remotely-loaded web app. Once the
// bridge is confirmed working, this page can be deleted. Navigate to /rc-test
// INSIDE the native Android app (not a normal browser).

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";

type Result = "starting" | "web" | "no-key" | "PASS" | "FAIL";

export default function RcTestPage() {
  const [result, setResult] = useState<Result>("starting");
  const [detail, setDetail] = useState<string>("Running...");

  useEffect(() => {
    (async () => {
      if (!isNativeApp()) {
        setResult("web");
        setDetail("Open this page INSIDE the native Android app to test the bridge. In a normal web browser there is no Capacitor bridge, so this test does not apply.");
        return;
      }

      const key = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
      if (!key) {
        setResult("no-key");
        setDetail("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY is not set. Add your RevenueCat PUBLIC Android SDK key in Vercel, redeploy, then reopen this page.");
        return;
      }

      try {
        const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey: key });
        const offerings = await Purchases.getOfferings();

        const current = offerings?.current ?? null;
        const pkgCount = current?.availablePackages?.length ?? 0;
        setResult("PASS");
        setDetail(
          "The native bridge works. getOfferings() returned successfully. " +
            "Current offering: " +
            (current?.identifier ?? "(none configured in RevenueCat yet -- that is fine for this test)") +
            ". Packages available: " +
            pkgCount +
            "."
        );
      } catch (e: any) {
        setResult("FAIL");
        const msg = e?.message ? String(e.message) : String(e);
        const code = e?.code != null ? String(e.code) : "n/a";
        setDetail(
          "getOfferings() threw. Message: " +
            msg +
            " | code: " +
            code +
            ". NOTE: if this mentions the API key or configuration, the BRIDGE is actually working (good) and you just need the correct key/offerings. If it says the Purchases plugin is 'not implemented' or missing, the native module is not installed -- run 'npx cap sync android' and rebuild the app."
        );
      }
    })();
  }, []);

  const color =
    result === "PASS" ? "#22c55e" : result === "FAIL" ? "#ef4444" : "#94a3b8";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>
          RevenueCat bridge test
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color, margin: 0 }}>{result}</h1>
        <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: "#cbd5e1" }}>{detail}</p>
        <p style={{ marginTop: 24, fontSize: 12, color: "#475569" }}>
          Delete this page (app/rc-test) once the bridge is confirmed.
        </p>
      </div>
    </main>
  );
}
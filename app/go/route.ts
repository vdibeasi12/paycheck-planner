import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bare /go (no /go/<campaign> segment) -- see app/go/[campaign]/route.ts for
// the full explanation. Tags campaign "general" for a link with no specific
// placement to distinguish.
export async function GET(request: Request) {
  const dest = new URL("/", request.url);
  dest.searchParams.set("utm_source", "share");
  dest.searchParams.set("utm_medium", "personal");
  dest.searchParams.set("utm_campaign", "general");
  return NextResponse.redirect(dest, 307);
}

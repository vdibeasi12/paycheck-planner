import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A short, memorable link to hand out anywhere the auto-attribution in
// AttributionCapture.tsx can't see: a YouTube video description or pinned
// comment, a bio link, a text/DM, a forum post. Someone who watches a video
// and then just types the URL in later -- instead of clicking a tagged
// link -- shows up as "direct" with no way to tell it apart from someone who
// bookmarked the site, a bot, or (per the admin dashboard's own visitor
// data) an internal/QA session. paycheckplanner.ai/go/<anything> fixes that:
// it 307-redirects straight to the homepage with utm_source/medium baked in
// and the <campaign> segment carried through as utm_campaign, so wherever
// this link gets dropped shows up as its own row in the admin dashboard's
// "Traffic sources" and "Conversion by source" tables instead of vanishing
// into "direct". 307 (not 308) so browsers/crawlers never cache the
// redirect and every click is counted fresh.
//
// Examples: /go/yt-desc, /go/yt-pinned-comment, /go/bio, /go/reddit-dm.
// Bare /go (no segment) is handled by the sibling app/go/route.ts and
// tags campaign "general".
//
// Optional ?to=/path (Aug 29 2026): same idea, but for promoting an
// internal page other than the homepage -- e.g. the lead-magnet worksheet
// from a callout on the Money Score result page. Still goes through /go so
// the click shows up tagged in the same "Traffic sources" table rather than
// as an untagged internal link. `to` must be a same-site path starting with
// exactly one "/" (never "//" or an absolute URL) so this can't be turned
// into an open redirect; anything else falls back to "/".
function sanitizeCampaign(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "general";
}

function sanitizeDestination(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaign: string }> }
) {
  const { campaign } = await params;
  const reqUrl = new URL(request.url);
  const dest = new URL(sanitizeDestination(reqUrl.searchParams.get("to")), request.url);
  dest.searchParams.set("utm_source", "share");
  dest.searchParams.set("utm_medium", "personal");
  dest.searchParams.set("utm_campaign", sanitizeCampaign(decodeURIComponent(campaign)));
  return NextResponse.redirect(dest, 307);
}

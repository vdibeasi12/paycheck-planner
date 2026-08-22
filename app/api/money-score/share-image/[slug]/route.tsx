import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getScoreBand } from "@/lib/money-score";

export const runtime = "edge";

// Generates the actual social-share card for a Money Quiz result: a
// branded 1200x630 PNG with the score front and center, colored by band.
// This is what turns "I scored 82/100" into something worth screenshotting
// or replying to on X/Reddit/a YouTube comment -- a plain-text link
// preview gets scrolled past, a bold score card gets a reaction.
//
// Single source of truth: referenced as openGraph/twitter image metadata
// on the result page (so link previews render it automatically) AND linked
// directly as a "Download image" button on the result page itself (for
// platforms like Instagram Stories that don't unfurl link previews at all).
//
// Public by design, same posture as the result page itself -- share_slug is
// an unguessable random token (see generateShareSlug in lib/money-score.ts),
// and only score is read here, which is already public per the
// money_score_results RLS column grants.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("money_score_results")
    .select("score")
    .eq("share_slug", slug)
    .single();

  const score = data?.score;

  if (typeof score !== "number") {
    // Unknown slug -- still return a valid (generic) card rather than a
    // broken image icon in a social preview or a 404 someone might share.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#020617",
            color: "#e2e8f0",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700 }}>The Money Quiz</div>
          <div style={{ fontSize: 28, color: "#64748b", marginTop: 16 }}>
            paycheckplanner.ai
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const band = getScoreBand(score);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#020617",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle band-colored glow, top-left */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: 420,
            backgroundColor: band.color,
            opacity: 0.18,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 90,
            width: 620,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#34d399",
              textTransform: "uppercase",
              letterSpacing: 2,
              display: "flex",
            }}
          >
            The Money Quiz
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#ffffff",
              marginTop: 14,
              display: "flex",
            }}
          >
            {band.label}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#94a3b8",
              marginTop: 18,
              display: "flex",
            }}
          >
            paycheckplanner.ai/money-score
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 580,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              height: 340,
              borderRadius: 340,
              border: `16px solid ${band.color}`,
              backgroundColor: "#0f172a",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 120, fontWeight: 700, color: "#ffffff", display: "flex" }}>
                {score}
              </div>
              <div style={{ fontSize: 26, color: "#64748b", display: "flex" }}>out of 100</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

// lib/confetti.ts
import confetti from "canvas-confetti";

const brand = ["#34D399", "#2DD4BF", "#10B981", "#A7F3D0", "#FBBF24"];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** A celebratory burst — use when a goal is completed. */
export function celebrate() {
  if (prefersReducedMotion()) return;

  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: brand });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: brand });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({ particleCount: 120, spread: 80, startVelocity: 45, origin: { y: 0.6 }, colors: brand });
}

/** A small pop — use for crossing an interim milestone (25/50/75%). */
export function popMilestone() {
  if (prefersReducedMotion()) return;
  confetti({ particleCount: 50, spread: 55, startVelocity: 35, origin: { y: 0.7 }, colors: brand });
}

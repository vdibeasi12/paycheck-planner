// app/components/AppQrCode.tsx
//
// The QR code that gets the mobile app onto a phone. One definition, used by
// both the homepage and the footer, because the hand-rolled SVG it replaces
// was subtly broken and there is no reason to have two chances at that.
//
// What was wrong with the old one (measured Sep 12 2026, by decoding it):
//
//   The data was fine -- it encoded the Play Store URL correctly. The problem
//   was the frame around it. It carried a ONE-module quiet zone; the QR spec
//   requires FOUR. Rendered at the size the footer actually used it (a 112px
//   box with p-2 padding, so 96px of code), it FAILED to decode -- and that
//   was a clean screenshot with a perfect pixel grid and full contrast, which
//   is a far easier target than a phone camera held at an angle. Re-rendering
//   the same code with a proper quiet zone made it decode at that same size.
//   So it was not "a bit small," it was not scannable.
//
// Three things changed here:
//
//   1. Four-module quiet zone, baked into the SVG's own white background
//      rather than left to CSS padding. Padding on the wrapper shrinks the
//      code inside a fixed box; a quiet zone inside the viewBox does not.
//   2. It points at https://paycheckplanner.ai/app rather than straight at the Play Store
//      listing. Shorter data means fewer modules -- 29 across instead of 37 --
//      so at the same on-screen size every module is ~25% bigger and easier
//      for a camera to resolve. It also means the destination can change
//      without reprinting the code: see app/app/route.ts, which sends
//      Android to Play and iOS somewhere sensible until the App Store build
//      is live.
//   3. Error correction level Q instead of M. At this data length it costs
//      nothing -- both fit in version 3 -- and it survives a worse photo.
//
// Default size is deliberately generous: 176px over 37 modules is ~4.8px per
// module, comfortably above the ~4px where camera scanning gets unreliable.
// If you shrink it, re-check that it still scans from an actual phone.
export default function AppQrCode({ className = "h-44 w-44" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 37 37"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="QR code to download the Paycheck Planner mobile app"
    >
      <path fill="#ffffff" d="M0 0h37v37H0z" />
      <path stroke="#000000" d="M4 4.5h7m1 0h1m2 0h3m1 0h5m2 0h7M4 5.5h1m5 0h1m1 0h1m1 0h1m2 0h1m1 0h3m1 0h2m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h1m2 0h1m1 0h2m1 0h1m2 0h1m2 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h5m1 0h2m2 0h1m1 0h1m1 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h5m1 0h2m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m2 0h2m1 0h1m3 0h2m1 0h2m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h2m1 0h1m3 0h1m1 0h3M5 12.5h2m1 0h1m1 0h2m4 0h1m2 0h1m1 0h1m2 0h1m1 0h1m1 0h5M5 13.5h5m2 0h1m4 0h1m3 0h2m3 0h1m3 0h1m1 0h1M6 14.5h1m1 0h1m1 0h1m1 0h1m2 0h1m2 0h5m4 0h2m1 0h3M6 15.5h1m4 0h3m2 0h1m1 0h2m1 0h3m1 0h2m4 0h1M4 16.5h3m3 0h1m1 0h1m2 0h3m1 0h1m1 0h1m1 0h2m1 0h2M4 17.5h1m1 0h1m1 0h1m4 0h1m2 0h1m1 0h2m1 0h1m2 0h4m3 0h2M4 18.5h2m1 0h1m2 0h3m1 0h1m2 0h1m2 0h1m1 0h1m1 0h1m1 0h2m2 0h3M7 19.5h1m1 0h1m4 0h3m3 0h2m1 0h1m1 0h3m3 0h1M4 20.5h2m1 0h2m1 0h2m3 0h1m3 0h1m1 0h1m2 0h1m1 0h1m2 0h1m2 0h1M8 21.5h2m2 0h1m6 0h1m2 0h1m1 0h3m2 0h1m1 0h2M4 22.5h1m2 0h1m2 0h1m4 0h3m4 0h1m2 0h1m3 0h4M5 23.5h5m1 0h7m1 0h1m1 0h1m1 0h1m2 0h1m1 0h1m2 0h2M4 24.5h1m1 0h2m1 0h3m1 0h5m2 0h2m2 0h5m2 0h1M12 25.5h1m2 0h4m1 0h2m2 0h1m3 0h1m3 0h1M4 26.5h7m1 0h4m1 0h1m4 0h3m1 0h1m1 0h1m1 0h3M4 27.5h1m5 0h1m6 0h2m2 0h1m2 0h1m3 0h1m3 0h1M4 28.5h1m1 0h3m1 0h1m1 0h3m1 0h1m3 0h1m1 0h1m1 0h6M4 29.5h1m1 0h3m1 0h1m3 0h1m3 0h4m2 0h2m2 0h1m1 0h1M4 30.5h1m1 0h3m1 0h1m1 0h1m1 0h1m4 0h2m2 0h1m3 0h2m3 0h1M4 31.5h1m5 0h1m1 0h7m1 0h5m1 0h2m3 0h1M4 32.5h7m2 0h5m1 0h3m1 0h2m3 0h1m2 0h2" />
    </svg>
  )
}

// app/components/PaycheckPlannerLogo.tsx
import React from "react";

type Props = {
  /** Rendered height in px. Width scales automatically. Default 32. */
  size?: number;
  className?: string;
};

/**
 * Official Paycheck Planner logo. The transparent PNG lives at /public/logo.png,
 * so it sits cleanly on any background. Replace that file to update the logo
 * everywhere at once.
 */
export function PaycheckPlannerLogo({ size = 32, className = "" }: Props) {
  return (
    <img
      src="/logo.png"
      alt="Paycheck Planner"
      style={{ height: size, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}

export default PaycheckPlannerLogo;

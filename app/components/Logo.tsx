import React from "react"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
}

export default function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { height: "40px", width: "auto" },
    md: { height: "60px", width: "auto" },
    lg: { height: "80px", width: "auto" },
    xl: { height: "120px", width: "auto" },
  }

  const config = sizeConfig[size]

  return (
    <div
      style={{
        height: config.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        flex: "0 0 auto",
      }}
    >
      <img
        src="/logo.png"
        alt="Paycheck Planner Logo"
        style={{
          height: "100%",
          width: config.width,
          objectFit: "contain",
          display: "block",
          maxWidth: "100%",
        }}
      />
    </div>
  )
}
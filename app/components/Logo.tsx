interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const heights = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
    '2xl': 'h-32',
  }

  // The logo's "Paycheck" wordmark is dark navy and was designed for light
  // backgrounds, so it sits on a white rounded chip to stay legible on the
  // dark theme. Tune bg-white / padding / rounding to taste.
  return (
    <div
      className={`inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm ${className}`}
    >
      <img
        src="/logo.png"
        alt="Paycheck Planner"
        className={`${heights[size]} w-auto object-contain`}
      />
    </div>
  )
}

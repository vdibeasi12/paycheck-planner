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

  return (
    <div className={`flex items-center overflow-visible ${heights[size]} ${className}`}>
      <img
        src="/logo.png"
        alt="Paycheck Planner"
        className="h-full w-auto object-contain"
      />
    </div>
  )
}
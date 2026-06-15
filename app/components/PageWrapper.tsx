interface PageWrapperProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl'
}

export default function PageWrapper({ 
  children, 
  maxWidth = 'lg' 
}: PageWrapperProps) {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-[#020617] text-white py-12 px-6">
      <div className={`${maxWidths[maxWidth]} mx-auto w-full`}>
        {children}
      </div>
    </div>
  )
}

interface MyDayLogsLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  text?: string // Added text prop for white-label use
}

export function MyDayLogsLogo({
  className = "",
  size = "md",
  showText = true,
  text = "MyDayLogs",
}: MyDayLogsLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/mydaylogs-logo.png" alt="MyDayLogs Logo" className={`${sizeClasses[size]} object-contain`} />

      {/* Brand Text */}
      {showText && <span className={`font-bold text-emerald-600 ${textSizeClasses[size]}`}>{text}</span>}
    </div>
  )
}

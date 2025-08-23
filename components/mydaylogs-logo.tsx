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
  text = "MyDayLogs", // Updated default text from "Mydailylogs" to "MyDayLogs"
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
      {/* MyDayLogs Logo SVG */}
      <div className={`${sizeClasses[size]} bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm`}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2/3 h-2/3 text-white">
          {/* Checkmark icon representing task completion */}
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && <span className={`font-bold text-emerald-600 ${textSizeClasses[size]}`}>{text}</span>}
    </div>
  )
}

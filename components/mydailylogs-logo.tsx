interface MydailylogsLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
}

export function MydailylogsLogo({ className = "", size = "md", showText = true }: MydailylogsLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
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
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background Circle */}
          <circle cx="20" cy="20" r="18" fill="var(--brand-primary)" className="drop-shadow-sm" />

          {/* Calendar/Log Icon */}
          <rect x="10" y="12" width="20" height="16" rx="2" fill="white" opacity="0.95" />

          {/* Calendar Header */}
          <rect x="10" y="12" width="20" height="4" rx="2" fill="var(--brand-secondary)" />

          {/* Checkmark Lines */}
          <rect x="13" y="19" width="8" height="1.5" rx="0.75" fill="var(--brand-primary)" />
          <rect x="13" y="22" width="6" height="1.5" rx="0.75" fill="var(--brand-primary)" />
          <rect x="13" y="25" width="10" height="1.5" rx="0.75" fill="var(--brand-primary)" />

          {/* Checkmarks */}
          <path
            d="M25 19.5L26.5 21L29 18.5"
            stroke="var(--brand-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M25 22.5L26.5 24L29 21.5"
            stroke="var(--brand-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-brand-primary ${textSizeClasses[size]} leading-tight`}>Mydailylogs</span>
          {size === "lg" || size === "xl" ? (
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              Daily Compliance and Reporting made simple
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

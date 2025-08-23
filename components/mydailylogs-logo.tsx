import { Check } from "lucide-react"

interface MydailylogsLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
}

export function MydailylogsLogo({ className = "", size = "md", showText = true }: MydailylogsLogoProps) {
  const textSizeClasses = {
    sm: "text-lg", // increased from text-base
    md: "text-xl", // increased from text-lg
    lg: "text-2xl", // increased from text-xl
    xl: "text-3xl", // increased from text-2xl
  }

  const iconSizeClasses = {
    sm: "w-6 h-6", // increased from w-4 h-4
    md: "w-7 h-7", // increased from w-5 h-5
    lg: "w-8 h-8", // increased from w-6 h-6
    xl: "w-10 h-10", // increased from w-7 h-7
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center gap-1">
        <div className={`${iconSizeClasses[size]} bg-emerald-600 rounded-full flex items-center justify-center`}>
          <Check className="text-white stroke-[3]" style={{ width: "60%", height: "60%" }} />
        </div>
        <span className={`font-bold text-emerald-600 ${textSizeClasses[size]} leading-tight`}>Mydailylogs</span>
      </div>
    </div>
  )
}

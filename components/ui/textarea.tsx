import type * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-gray-400 placeholder:text-gray-600 focus-visible:border-blue-600 focus-visible:ring-blue-300 aria-invalid:ring-red-300 dark:aria-invalid:ring-red-400 aria-invalid:border-red-500 bg-white flex field-sizing-content min-h-16 w-full rounded-md border-2 px-3 py-2 text-base text-gray-900 shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-200 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

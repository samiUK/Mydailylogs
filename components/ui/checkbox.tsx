"use client"

import type * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-gray-400 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus-visible:border-blue-600 focus-visible:ring-blue-300 aria-invalid:ring-red-300 dark:aria-invalid:ring-red-400 aria-invalid:border-red-500 size-4 shrink-0 rounded-[4px] border-2 shadow-sm transition-all outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-200",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 font-bold" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

"use client"

import React from "react"
import { X } from "lucide-react"
import { cancelRecurringAssignment } from "@/app/actions/team"

export function CancelAssignmentButton({
  assignmentId,
  organizationId,
  templateName,
}: {
  assignmentId: string
  organizationId: string
  templateName: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleCancel = () => {
    if (
      confirm(
        `Are you sure you want to cancel the recurring assignment for "${templateName}"? No future tasks will be auto-assigned.`,
      )
    ) {
      startTransition(async () => {
        const result = await cancelRecurringAssignment(assignmentId, organizationId)
        if (result.success) {
          window.location.reload()
        } else {
          alert(`Failed to cancel assignment: ${result.error}`)
        }
      })
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      title="Cancel recurring assignment"
    >
      <X className="w-3 h-3" />
    </button>
  )
}

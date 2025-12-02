"use server"

import { createClient } from "@/lib/supabase/server"

export async function cancelRecurringAssignment(assignmentId: string, organizationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("template_assignments")
    .update({
      is_active: false,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("organization_id", organizationId)

  if (error) {
    console.error("[v0] Error cancelling assignment:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

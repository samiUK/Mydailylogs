import { createClient } from "@/lib/supabase/client"

/**
 * Master Admin API Functions
 * Centralized API calls for the master dashboard
 */

export async function loadAllPayments() {
  const { data, error } = await createClient().from("payments").select(`*, subscriptions(*, organizations(*))`)

  if (error) throw error
  return data || []
}

export async function fetchAllPayments() {
  const { data, error } = await createClient()
    .from("payments")
    .select(`*, subscriptions(*, organizations(*))`)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function syncData() {
  const response = await fetch("/api/admin/comprehensive-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Sync failed")
  }

  return await response.json()
}

export async function comprehensiveSync() {
  const response = await fetch("/api/admin/comprehensive-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Sync failed")
  }

  return await response.json()
}

export async function archiveOrganizationAPI(orgId: string) {
  const response = await fetch("/api/admin/archive-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: orgId }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to archive organization: ${error}`)
  }

  return response
}

export async function deleteOrganizationAPI(orgId: string) {
  const response = await fetch("/api/admin/delete-organization", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: orgId }),
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(responseText)
  }

  return responseText
}

export async function getAuthUsers() {
  const response = await fetch("/api/admin/get-auth-users")
  const result = await response.json()
  return result.verificationMap || {}
}

export async function fetchDashboardData() {
  const response = await fetch("/api/master/dashboard-data", {
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data")
  }

  return await response.json()
}

export async function fetchDatabaseStats() {
  const response = await fetch("/api/admin/database-stats", {
    next: { revalidate: 60 },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch database stats")
  }

  return data
}

export async function upgradeTierForFreeAPI(organizationId: string, organizationName: string, planName: string) {
  const response = await fetch("/api/master/manage-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upgrade",
      organizationId,
      organizationName,
      planName,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to start trial")
  }

  return result
}

export async function cancelSubscriptionAPI(subscriptionId: string, organizationName: string) {
  const response = await fetch("/api/master/manage-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "cancel",
      subscriptionId,
      organizationName,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to cancel subscription")
  }

  return result
}

export async function downgradeTierForFreeAPI(subscriptionId: string, organizationName: string) {
  const response = await fetch("/api/master/manage-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "downgrade",
      subscriptionId,
      organizationName,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to downgrade")
  }

  return result
}

export async function manageSubscription(
  action: "upgrade" | "cancel" | "downgrade",
  params: { organizationId?: string; organizationName?: string; planName?: string; subscriptionId?: string },
) {
  const body: any = { action }

  if (action === "upgrade") {
    body.organizationId = params.organizationId
    body.organizationName = params.organizationName
    body.planName = params.planName
  } else if (action === "cancel" || action === "downgrade") {
    body.subscriptionId = params.subscriptionId
    body.organizationName = params.organizationName
  }

  const response = await fetch("/api/master/manage-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Failed to ${action}`)
  }

  return result
}

export async function addSubscriptionAPI(organizationId: string, planName: string) {
  const { error } = await createClient()
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      plan_name: planName,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (error) throw error
}

export async function processRefundAPI(paymentId: string, amount: number) {
  const response = await fetch("/api/admin/process-refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId,
      amount,
      reason: "requested_by_customer",
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to process refund")
  }

  return await response.json()
}

export async function processRefund(paymentId: string, amount: number) {
  return await processRefundAPI(paymentId, amount)
}

export async function unverifyAndResendEmailAPI(userEmail: string) {
  const response = await fetch("/api/admin/unverify-and-resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to resend verification")
  }

  return await response.json()
}

export async function unverifyAndResendEmail(userEmail: string) {
  return await unverifyAndResendEmailAPI(userEmail)
}

export async function verifyUserEmailAPI(userEmail: string) {
  const response = await fetch("/api/admin/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to verify email")
  }

  return await response.json()
}

export async function verifyEmail(userEmail: string) {
  return await verifyUserEmailAPI(userEmail)
}

export async function deleteUserAPI(userId: string) {
  const supabase = createClient()

  // Delete user from auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) throw authError

  // Delete user profile
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
  if (profileError) throw profileError
}

export async function handleDeleteUserAPI(userId: string) {
  const response = await fetch("/api/admin/delete-user", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to delete user")
  }

  return await response.json()
}

export async function deleteUserGDPR(userId: string) {
  return await handleDeleteUserAPI(userId)
}

export async function resetUserPasswordAPI(userEmail: string) {
  const response = await fetch("/api/admin/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail }),
  })

  if (!response.ok) {
    let errorMessage = "Failed to send reset email"
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      errorMessage = `Server error: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return await response.json()
}

export async function resetUserPassword(userEmail: string) {
  return await resetUserPasswordAPI(userEmail)
}

export async function sendResponseAPI(
  recipientEmail: string,
  subject: string,
  name: string,
  originalSubject: string,
  originalMessage: string,
  responseMessage: string,
) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "response",
      to: recipientEmail,
      subject,
      data: {
        name,
        originalSubject,
        originalMessage,
        responseMessage,
      },
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to send response")
  }

  return response
}

export async function sendEmailResponse(params: {
  recipientEmail: string
  subject: string
  name: string
  originalSubject: string
  originalMessage: string
  responseMessage: string
}) {
  return await sendResponseAPI(
    params.recipientEmail,
    params.subject,
    params.name,
    params.originalSubject,
    params.originalMessage,
    params.responseMessage,
  )
}

export async function addSuperuserAPI(email: string, password: string) {
  const response = await fetch("/api/admin/add-superuser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to add superuser")
  }

  return data
}

export async function addSuperuser(email: string, password: string) {
  return await addSuperuserAPI(email, password)
}

export async function removeSuperuserAPI(superuserId: string) {
  const response = await fetch("/api/admin/remove-superuser", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ superuserId }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to remove superuser")
  }

  return data
}

export async function removeSuperuser(superuserId: string) {
  return await removeSuperuserAPI(superuserId)
}

export async function updateSuperuserAPI(superuserId: string, newPassword: string) {
  const response = await fetch("/api/admin/update-superuser", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ superuserId, newPassword }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to update superuser")
  }

  return data
}

export async function updateSuperuser(superuserId: string, newPassword: string) {
  return await updateSuperuserAPI(superuserId, newPassword)
}

export async function updateOrganizationNameAPI(organizationId: string, newName: string) {
  const response = await fetch("/api/admin/update-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_id: organizationId,
      organization_name: newName,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    if (response.status === 409) {
      throw new Error(`The organization name "${newName}" is already taken. Please choose a different name.`)
    }
    throw new Error(errorData.error || "Failed to update organization")
  }

  return response
}

export async function updateOrganization(organizationId: string, newName: string) {
  return await updateOrganizationNameAPI(organizationId, newName)
}

export async function fetchUsageMetricsAPI() {
  const response = await fetch("/api/master/usage-metrics", {
    cache: "no-store",
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch usage metrics")
  }

  return data
}

export async function fetchActivityLogs() {
  const response = await fetch("/api/master/activity-logs", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch activity logs")
  }

  return await response.json()
}

export async function generateImpersonationLinkAPI(user: any) {
  const response = await fetch("/api/impersonation/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userEmail: user.email,
      userId: user.id,
      userRole: user.role,
      organizationId: user.organization_id,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to create impersonation link")
  }

  return data
}

export async function generateImpersonationLink(user: {
  email: string
  id: string
  role: string
  organization_id: string
}) {
  return await generateImpersonationLinkAPI(user)
}

export async function modifyQuotaAPI(
  organizationId: string,
  fieldName: string,
  newValue: number | null,
  reason: string,
  masterAdminPassword: string,
) {
  const response = await fetch("/api/master/modify-quota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationId,
      fieldName,
      newValue,
      reason,
      masterAdminPassword,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to modify quota")
  }

  return data
}

export async function modifyQuota(params: {
  organizationId: string
  fieldName: string
  newValue: number | null
  reason: string
  masterAdminPassword: string
}) {
  return await modifyQuotaAPI(
    params.organizationId,
    params.fieldName,
    params.newValue,
    params.reason,
    params.masterAdminPassword,
  )
}

export async function loadQuotaForOrganizationAPI(organizationId: string) {
  const response = await fetch("/api/master/organization-quota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })

  if (!response.ok) {
    throw new Error("Failed to load quota information")
  }

  return await response.json()
}

export async function fetchOrganizationQuota(organizationId: string) {
  return await loadQuotaForOrganizationAPI(organizationId)
}

export async function emailOrgReportsAPI(organizationId: string) {
  const response = await fetch("/api/master/email-org-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to send report emails")
  }

  return data
}

export async function emailOrgReports(organizationId: string) {
  return await emailOrgReportsAPI(organizationId)
}

export async function changeRoleAPI(profileId: string, newRole: string, organizationId: string) {
  const response = await fetch("/api/master/change-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profileId,
      newRole,
      organizationId,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to change role")
  }

  return data
}

export const archiveOrganization = archiveOrganizationAPI
export const deleteOrganization = deleteOrganizationAPI
export const addSubscription = addSubscriptionAPI

// Utility functions for logging impersonation activities
import { createClient } from '@/lib/supabase/server'

export type ActivityType = 
  | 'profile_update'
  | 'password_change'
  | 'settings_change'
  | 'data_access'
  | 'user_management'
  | 'subscription_change'
  | 'payment_action'
  | 'template_management'
  | 'report_access'
  | 'checklist_modification'
  | 'organization_settings'

export type RiskLevel = 'low' | 'medium' | 'high'

interface LogActivityParams {
  adminEmail: string
  adminType: 'masteradmin' | 'support'
  impersonatedUserId: string
  impersonatedUserEmail: string
  organizationId: string | null
  actionType: ActivityType
  actionDetails: any
  riskLevel?: RiskLevel
  ipAddress?: string
  userAgent?: string
}

export async function logImpersonationActivity(params: LogActivityParams) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('impersonation_activity_logs')
      .insert({
        admin_email: params.adminEmail,
        admin_type: params.adminType,
        impersonated_user_id: params.impersonatedUserId,
        impersonated_user_email: params.impersonatedUserEmail,
        organization_id: params.organizationId,
        action_type: params.actionType,
        action_details: params.actionDetails,
        risk_level: params.riskLevel || 'low',
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      })

    if (error) {
      console.error('[v0] Error logging impersonation activity:', error)
    } else {
      console.log('[v0] Impersonation activity logged:', params.actionType)
    }
  } catch (error) {
    console.error('[v0] Failed to log impersonation activity:', error)
  }
}

// Helper function to get impersonation session info from localStorage
export function getImpersonationSession() {
  if (typeof window === 'undefined') return null
  
  const impersonationData = localStorage.getItem('impersonation')
  if (!impersonationData) return null
  
  try {
    return JSON.parse(impersonationData)
  } catch {
    return null
  }
}

// Determine risk level based on action type
export function determineRiskLevel(actionType: ActivityType): RiskLevel {
  const highRisk: ActivityType[] = ['password_change', 'user_management', 'subscription_change', 'payment_action']
  const mediumRisk: ActivityType[] = ['settings_change', 'organization_settings', 'template_management']
  
  if (highRisk.includes(actionType)) return 'high'
  if (mediumRisk.includes(actionType)) return 'medium'
  return 'low'
}

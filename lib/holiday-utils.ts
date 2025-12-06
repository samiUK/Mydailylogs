import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Check if a given date is a holiday for an organization
 */
export async function isHoliday(
  supabase: SupabaseClient,
  organizationId: string,
  date: string,
): Promise<{ isHoliday: boolean; holidayName?: string }> {
  const { data: holidays } = await supabase
    .from("holidays")
    .select("name, date")
    .eq("organization_id", organizationId)
    .eq("date", date)
    .single()

  if (holidays) {
    return { isHoliday: true, holidayName: holidays.name }
  }

  return { isHoliday: false }
}

/**
 * Check if a given date is a business day (not weekend, not holiday, business open)
 */
export async function isBusinessDay(supabase: SupabaseClient, organizationId: string, date: string): Promise<boolean> {
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()

  // Check if it's a weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }

  // Check business hours
  const { data: organization } = await supabase
    .from("organizations")
    .select("business_hours")
    .eq("organization_id", organizationId)
    .single()

  if (organization?.business_hours) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const dayName = dayNames[dayOfWeek]
    const dayHours = organization.business_hours[dayName]

    if (dayHours && !dayHours.enabled) {
      return false
    }
  }

  // Check if it's a holiday
  const { isHoliday: holidayCheck } = await isHoliday(supabase, organizationId, date)
  if (holidayCheck) {
    return false
  }

  return true
}

/**
 * Find the next business day after the given date
 * Skips weekends, holidays, and days when business is closed
 */
export async function getNextBusinessDay(
  supabase: SupabaseClient,
  organizationId: string,
  startDate: string,
  maxDaysToCheck = 30,
): Promise<string | null> {
  const currentDate = new Date(startDate)
  let daysChecked = 0

  while (daysChecked < maxDaysToCheck) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dateString = currentDate.toISOString().split("T")[0]

    const isBusiness = await isBusinessDay(supabase, organizationId, dateString)
    if (isBusiness) {
      return dateString
    }

    daysChecked++
  }

  return null // No business day found within the range
}

/**
 * Adjust a date to the next business day if it falls on a non-business day
 */
export async function adjustToBusinessDay(
  supabase: SupabaseClient,
  organizationId: string,
  date: string,
): Promise<{ adjustedDate: string; wasAdjusted: boolean; reason?: string }> {
  const isBusiness = await isBusinessDay(supabase, organizationId, date)

  if (isBusiness) {
    return { adjustedDate: date, wasAdjusted: false }
  }

  // Check why it's not a business day
  const { isHoliday: holidayCheck, holidayName } = await isHoliday(supabase, organizationId, date)
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  let reason = ""
  if (holidayCheck) {
    reason = `${holidayName || "Holiday"}`
  } else if (isWeekend) {
    reason = "Weekend"
  } else {
    reason = "Business closed"
  }

  const nextBusinessDay = await getNextBusinessDay(supabase, organizationId, date)

  if (!nextBusinessDay) {
    // If no business day found, return original date
    return { adjustedDate: date, wasAdjusted: false, reason: `${reason} - no business day found within 30 days` }
  }

  return { adjustedDate: nextBusinessDay, wasAdjusted: true, reason }
}

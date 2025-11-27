/**
 * UK Date Formatting Utilities
 * Uses dd-mm-yyyy format throughout the system
 */

/**
 * Format a date to UK short format: dd-mm-yyyy
 */
export function formatUKDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Format a date to UK format with flexible output
 * @param date - Date to format
 * @param format - "short" for dd-mm-yyyy, "long" for dd Month yyyy, "datetime" for dd-mm-yyyy HH:mm
 */
export function formatDateUK(date: Date | string, format: "short" | "long" | "datetime" = "long"): string {
  if (format === "short") {
    return formatUKDate(date)
  } else if (format === "datetime") {
    return formatUKDateTime(date)
  } else {
    return formatUKDateLong(date)
  }
}

/**
 * Format a date to UK long format: dd Month yyyy
 */
export function formatUKDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Format a date and time to UK format: dd-mm-yyyy HH:mm
 */
export function formatUKDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dateStr = formatUKDate(d)
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${dateStr} ${time}`
}

/**
 * Format a date and time to UK format with seconds: dd-mm-yyyy HH:mm:ss
 */
export function formatUKDateTimeFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dateStr = formatUKDate(d)
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return `${dateStr} ${time}`
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

  return formatUKDate(d)
}

export async function detectUserCountry(): Promise<string> {
  try {
    // Use ipapi.co free API for geolocation
    const response = await fetch("https://ipapi.co/json/", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      return "GB" // Default to UK if API fails
    }

    const data = await response.json()
    return data.country_code || "GB"
  } catch (error) {
    console.error("[v0] Geolocation detection failed:", error)
    return "GB" // Default to UK on error
  }
}

export function getCurrencyFromCountry(countryCode: string): "GBP" | "USD" {
  return countryCode === "GB" ? "GBP" : "USD"
}

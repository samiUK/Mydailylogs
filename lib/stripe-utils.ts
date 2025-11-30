export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch("/api/stripe/cancel-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscriptionId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to cancel subscription")
  }
}

export async function createBillingPortalSession(): Promise<string> {
  const response = await fetch("/api/stripe/create-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to create billing portal session")
  }

  const data = await response.json()
  return data.url
}

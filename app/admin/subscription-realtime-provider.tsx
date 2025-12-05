"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

type Subscription = {
  id: string
  organization_id: string
  plan_name: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
  stripe_subscription_id: string | null
}

type SubscriptionContextType = {
  subscription: Subscription | null
  isLoading: boolean
  refreshSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isLoading: true,
  refreshSubscription: async () => {},
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionRealtimeProvider({
  children,
  organizationId,
  initialSubscription,
}: {
  children: React.ReactNode
  organizationId: string
  initialSubscription: Subscription | null
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(initialSubscription)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const refreshSubscription = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing"])
        .maybeSingle()

      if (error) throw error

      console.log("[v0] 🔄 Subscription refreshed:", data?.plan_name || "none")
      setSubscription(data)

      // Refresh the page data to update UI
      router.refresh()
    } catch (error) {
      console.error("[v0] ❌ Failed to refresh subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time subscription changes via Supabase
  useEffect(() => {
    console.log("[v0] 📡 Setting up real-time subscription listener for org:", organizationId)

    const channel = supabase
      .channel(`subscription-changes-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "subscriptions",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log("[v0] 🎉 Subscription changed in real-time:", payload)

          if (payload.eventType === "DELETE") {
            setSubscription(null)
          } else if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setSubscription(payload.new as Subscription)
          }

          // Refresh page to update all components
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      console.log("[v0] 🔌 Cleaning up subscription listener")
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase, router])

  // Polling fallback every 30 seconds (in case real-time fails)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[v0] 🔄 Polling subscription status...")
      refreshSubscription()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [organizationId])

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

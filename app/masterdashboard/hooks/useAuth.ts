"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function useAuth() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/check-master-auth")
      const data = await response.json()

      if (!data.isMasterAdmin) {
        router.push("/masterlogin")
        return
      }

      setIsAuthenticated(true)
    } catch (error) {
      console.error("[v0] Auth check failed:", error)
      router.push("/masterlogin")
    } finally {
      setIsLoading(false)
    }
  }

  return { isAuthenticated, isLoading }
}

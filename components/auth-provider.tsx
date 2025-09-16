"use client"

import type React from "react"

import { useEffect } from "react"
import { TokenStorage } from "@/lib/auth/token-storage"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setup fetch interceptor to add Authorization headers
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = TokenStorage.getAccessToken()

      if (token) {
        const headers = new Headers(init?.headers)
        headers.set("Authorization", `Bearer ${token}`)

        init = {
          ...init,
          headers,
        }
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return <>{children}</>
}

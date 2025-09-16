"use client"

import type React from "react"
import { createContext, useContext, useEffect } from "react"

interface PerformanceContextType {
  startMemoryCleanup: () => void
  stopMemoryCleanup: () => void
}

const PerformanceContext = createContext<PerformanceContextType | null>(null)

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      console.log = () => {}
      console.warn = () => {}
      console.error = () => {}
    }

    let cleanupInterval: NodeJS.Timeout | null = null

    const startMemoryCleanup = () => {
      if (cleanupInterval) return
      cleanupInterval = setInterval(() => {
        if (typeof window !== "undefined") {
          // Clear any accumulated data
          if (window.performance && window.performance.clearMarks) {
            window.performance.clearMarks()
          }
          if (window.performance && window.performance.clearMeasures) {
            window.performance.clearMeasures()
          }

          // Force garbage collection if available
          const globalObj = globalThis as any
          if (globalObj.gc && typeof globalObj.gc === "function") {
            try {
              globalObj.gc()
            } catch (error) {
              // Silently ignore gc errors
            }
          }
        }
      }, 60000) // Every 60 seconds instead of 30
    }

    const stopMemoryCleanup = () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
      }
    }

    startMemoryCleanup()

    return () => {
      stopMemoryCleanup()
    }
  }, [])

  return (
    <PerformanceContext.Provider
      value={{
        startMemoryCleanup: () => {},
        stopMemoryCleanup: () => {},
      }}
    >
      {children}
    </PerformanceContext.Provider>
  )
}

export const usePerformance = () => {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error("usePerformance must be used within a PerformanceProvider")
  }
  return context
}

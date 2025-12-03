"use client"

import { useEffect, useState } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    console.error("[v0] Global error occurred:", error)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = "https://mydaylogs.co.uk"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>Something went wrong</h1>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Redirecting to homepage in <strong>{countdown}</strong> {countdown === 1 ? "second" : "seconds"}...
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "https://mydaylogs.co.uk")}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#fff",
                  color: "#000",
                  border: "1px solid #ddd",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

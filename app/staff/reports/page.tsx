"use client"

import { useState, useEffect } from "react"

export default function StaffReportsPage() {
  console.log("[v0] Staff Reports page - MINIMAL VERSION LOADED")

  const [message, setMessage] = useState("Loading...")

  useEffect(() => {
    console.log("[v0] Staff Reports - useEffect running")
    setMessage("Staff Reports Page is Working!")
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Log History</h1>
      <p className="text-lg">{message}</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>If you can see this, the page is executing properly!</p>
      </div>
    </div>
  )
}

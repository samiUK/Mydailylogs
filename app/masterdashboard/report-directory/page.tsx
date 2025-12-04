"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ReportDirectoryContent } from "../report-directory-content"

export default function ReportDirectoryPage() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  function checkAuth() {
    console.log("[v0] Report Directory page: Checking authentication...")

    // Check localStorage and cookies
    let masterAdminAuth = localStorage.getItem("masterAdminAuth")
    let masterAdminEmail = localStorage.getItem("masterAdminEmail")

    if (!masterAdminAuth || !masterAdminEmail) {
      const masterAdminCookie = document.cookie.split("; ").find((row) => row.startsWith("masterAdminImpersonation="))
      const emailCookie = document.cookie.split("; ").find((row) => row.startsWith("masterAdminEmail="))

      if (masterAdminCookie && emailCookie) {
        masterAdminAuth = "true"
        masterAdminEmail = emailCookie.split("=")[1]
        localStorage.setItem("masterAdminAuth", "true")
        localStorage.setItem("masterAdminEmail", masterAdminEmail)
      }
    }

    if (masterAdminAuth !== "true") {
      console.log("[v0] No master admin auth found, redirecting...")
      router.push("/masterlogin")
      return
    }

    console.log("[v0] Master admin authenticated")
  }

  return (
    <div className="container mx-auto p-6">
      <ReportDirectoryContent />
    </div>
  )
}

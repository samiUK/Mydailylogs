"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cookie, X } from 'lucide-react'
import Link from "next/link"

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent")
    if (!consent) {
      // Small delay for better UX
      setTimeout(() => {
        setShowBanner(true)
        setTimeout(() => setIsVisible(true), 100)
      }, 1000)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted")
    localStorage.setItem("cookieConsentDate", new Date().toISOString())
    setIsVisible(false)
    setTimeout(() => setShowBanner(false), 300)
  }

  const rejectCookies = () => {
    localStorage.setItem("cookieConsent", "rejected")
    localStorage.setItem("cookieConsentDate", new Date().toISOString())
    setIsVisible(false)
    setTimeout(() => setShowBanner(false), 300)
  }

  if (!showBanner) return null

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-2xl border-2">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">Cookie Notice (UK GDPR Compliant)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to provide essential functionality, analyze site usage, and improve your experience. 
                  By clicking "Accept", you consent to our use of cookies in accordance with UK GDPR regulations. 
                  We do not sell your personal data. You can withdraw consent at any time through your browser settings.
                  {" "}
                  <Link href="/privacy" className="text-primary underline hover:text-primary/80">
                    Learn more about our privacy practices
                  </Link>
                  .
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    ✓ Essential Cookies
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    ✓ Performance Analytics
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    ✓ Functional Cookies
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={rejectCookies}
                  className="w-full sm:w-auto"
                >
                  Reject Non-Essential
                </Button>
                <Button
                  onClick={acceptCookies}
                  className="w-full sm:w-auto"
                >
                  Accept All Cookies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

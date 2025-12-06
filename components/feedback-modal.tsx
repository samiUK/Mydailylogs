"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MessageSquare,
  Send,
  X,
  Upload,
  Trash2,
  CheckCircle,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Check,
  Copy,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface FeedbackModalProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  autoTrigger?: boolean
}

export function FeedbackModal({ isOpen, onOpenChange, trigger, autoTrigger = false }: FeedbackModalProps) {
  const [open, setOpen] = useState(isOpen || false)
  const [subject, setSubject] = useState("Feedback!")
  const [feedback, setFeedback] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [currentPage, setCurrentPage] = useState("")
  const [activeCampaign, setActiveCampaign] = useState<{
    promo_code: string
    discount_value: number
    discount_type: string
    id: string
    max_redemptions: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [hasShared, setHasShared] = useState(false)
  const [issuedPromoCode, setIssuedPromoCode] = useState<string | null>(null)
  const [isIssuingCode, setIsIssuingCode] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    const submitted = localStorage.getItem("feedbackSubmitted")
    if (submitted) {
      setHasSubmitted(true)
    }

    if (typeof window !== "undefined") {
      setCurrentPage(window.location.href)
    }
  }, [])

  useEffect(() => {
    if (autoTrigger && !hasSubmitted) {
      const checkGamificationTrigger = async () => {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("organization_id", user.id)
          .neq("id", user.id)

        const { data: templates } = await supabase.from("templates").select("id").eq("created_by", user.id)

        const teamMemberCount = profiles?.length || 0
        const templateCount = templates?.length || 0

        if (teamMemberCount >= 1 && templateCount >= 2) {
          setTimeout(() => setOpen(true), 2000)
        }
      }

      checkGamificationTrigger()
    }
  }, [autoTrigger, hasSubmitted])

  useEffect(() => {
    if (showThankYou) {
      fetchActiveCampaign()
    }
  }, [showThankYou])

  const fetchActiveCampaign = async () => {
    try {
      const response = await fetch("/api/promo-campaign/active")
      const data = await response.json()
      setActiveCampaign(data.campaign)
      console.log("[v0] Active campaign:", data.campaign)
    } catch (error) {
      console.error("[v0] Error fetching active campaign:", error)
      setActiveCampaign(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    const validFiles = imageFiles.slice(0, 3).filter((file) => file.size <= 5 * 1024 * 1024)
    setAttachments((prev) => [...prev, ...validFiles].slice(0, 3))
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim() || !name.trim()) return

    setIsSubmitting(true)

    try {
      console.log("[v0] Starting feedback submission...")
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Current user:", user?.id || "Anonymous")

      let organizationId = null
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

        organizationId = profile?.organization_id || null
      }

      const attachmentData = attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))

      const feedbackData = {
        name: name.trim(),
        email: email.trim() || user?.email || "Anonymous",
        subject: subject || "Feedback!",
        message: feedback.trim(),
        page_url: currentPage,
        attachments: attachmentData,
        user_id: user?.id || null,
        organization_id: organizationId,
        status: "unread",
      }

      console.log("[v0] Feedback data to insert:", feedbackData)

      const { error: dbError, data: insertedData } = await supabase.from("feedback").insert(feedbackData).select()

      console.log("[v0] Database insert result:", { error: dbError, data: insertedData })

      if (dbError) {
        console.error("[v0] Database error:", dbError)
        throw new Error(`Failed to save feedback: ${dbError.message}`)
      }

      if (insertedData && insertedData.length > 0) {
        setFeedbackId(insertedData[0].id)
      }

      console.log("[v0] Feedback successfully saved to database")

      try {
        console.log("[v0] Sending email notification to admin...")
        const emailResponse = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "feedback_notification",
            to: "info@mydaylogs.co.uk",
            subject: `New Feedback: ${subject || "Feedback!"}`,
            data: {
              name: name.trim(),
              email: email.trim() || user?.email || "Anonymous",
              subject: subject || "Feedback!",
              message: feedback.trim(),
              page_url: currentPage,
              submitted_at: new Date().toISOString(),
            },
          }),
        })

        if (!emailResponse.ok) {
          console.error("[v0] Failed to send admin notification email")
        } else {
          console.log("[v0] Admin notification email sent successfully")
        }
      } catch (emailError) {
        console.error("[v0] Error sending admin notification:", emailError)
      }

      localStorage.setItem("feedbackSubmitted", "true")
      setHasSubmitted(true)
      setShowThankYou(true)
    } catch (error) {
      console.error("[v0] Error sending feedback:", error)
      alert(
        `Sorry, there was an error sending your feedback: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const trackSocialShare = async (platform: string) => {
    try {
      console.log("[v0] Tracking social share:", platform)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        console.error("[v0] No user email found")
        return
      }

      // Construct share URLs for each platform
      const shareMessage = activeCampaign
        ? `I'm using MyDayLogs to streamline my work! ${activeCampaign.discount_value}% off for new users - submit feedback to get your code!`
        : "I'm using MyDayLogs to streamline my work! Check it out!"

      const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://mydaylogs.co.uk"

      let platformUrl = ""

      switch (platform) {
        case "facebook":
          platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`
          break
        case "twitter":
          platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`
          break
        case "linkedin":
          platformUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
          break
      }

      // Open social platform in new tab
      if (platformUrl) {
        window.open(platformUrl, "_blank", "noopener,noreferrer")
      }

      // Track the share
      const shareResponse = await fetch("/api/social-share/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          promoCode: activeCampaign?.promo_code,
          campaignId: activeCampaign?.id,
          feedbackId,
        }),
      })

      console.log("[v0] Share tracking response:", shareResponse.status)

      if (!shareResponse.ok) {
        throw new Error("Failed to track share")
      }

      if (activeCampaign?.id && feedbackId) {
        setIsIssuingCode(true)
        console.log("[v0] Issuing code for campaign:", activeCampaign.id)

        const codeResponse = await fetch("/api/promo-campaign/issue-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaignId: activeCampaign.id,
            feedbackId,
            socialSharePlatform: platform,
            userEmail: user.email,
          }),
        })

        console.log("[v0] Code issuance response:", codeResponse.status)

        if (codeResponse.ok) {
          const { promoCode } = await codeResponse.json()
          console.log("[v0] Promo code issued:", promoCode)
          setIssuedPromoCode(promoCode)
        } else {
          const errorData = await codeResponse.json()
          console.error("[v0] Failed to issue code:", errorData)
        }
        setIsIssuingCode(false)
      }

      setHasShared(true)
    } catch (error) {
      console.error("[v0] Error tracking social share:", error)
      setIsIssuingCode(false)
    }
  }

  const handleCopyCode = () => {
    if (issuedPromoCode) {
      navigator.clipboard.writeText(issuedPromoCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  const handleCloseModal = () => {
    setShowThankYou(false)
    setSubject("Feedback!")
    setFeedback("")
    setName("")
    setEmail("")
    setAttachments([])
    setOpen(false)
    onOpenChange?.(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)

    if (newOpen && typeof window !== "undefined") {
      setCurrentPage(window.location.href)
    }
  }

  if (hasSubmitted && !trigger) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {showThankYou ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-green-700 mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-4">Your feedback has been received and will be reviewed by our team.</p>
            <p className="text-sm text-gray-500 mb-6">
              We appreciate you taking the time to help us improve MyDayLogs.
            </p>

            <div className="border-t pt-6">
              {activeCampaign && hasShared && issuedPromoCode && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <h4 className="text-lg font-bold text-emerald-700">You Unlocked Your Discount!</h4>
                    <span className="text-2xl">🎉</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Thank you for sharing! Here's your exclusive {activeCampaign.discount_value}% off promo code:
                  </p>
                  <div className="bg-white border-2 border-dashed border-emerald-400 rounded-lg p-3 mb-2">
                    <div className="text-xs text-gray-600 mb-1">Your Unique Promo Code:</div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-2xl font-bold text-emerald-600 tracking-wider">{issuedPromoCode}</div>
                      <Button variant="ghost" size="sm" onClick={handleCopyCode} className="hover:bg-emerald-100">
                        {codeCopied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                    <p className="text-xs text-blue-700 font-medium">
                      💡 Not ready to upgrade yet? Save this code! It's valid for {activeCampaign.max_redemptions}{" "}
                      redemptions and you can use it anytime.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Use this code at checkout to get {activeCampaign.discount_value}% off your first month!
                  </p>
                  <p className="text-xs text-amber-600 font-medium">
                    This code is unique to you and can only be used once.
                  </p>
                </div>
              )}

              {activeCampaign && hasShared && isIssuingCode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-700">Generating your unique promo code...</p>
                  </div>
                </div>
              )}

              {activeCampaign && !hasShared && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🎁</span>
                    <h4 className="text-lg font-bold text-amber-700">Unlock {activeCampaign.discount_value}% Off!</h4>
                    <span className="text-2xl">🎁</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Share MyDayLogs on social media to unlock your exclusive discount code!
                  </p>
                  <p className="text-xs text-gray-500">
                    Click any share button below and your unique promo code will appear instantly
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-accent" />
                <h4 className="text-lg font-semibold text-gray-700">
                  {activeCampaign && !hasShared
                    ? "Share to Unlock Your Code!"
                    : activeCampaign
                      ? "Share & Help Others Save!"
                      : "Share MyDayLogs!"}
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {activeCampaign && !hasShared ? (
                  <>
                    Click any button below to share MyDayLogs and{" "}
                    <span className="font-semibold text-emerald-600">
                      unlock your {activeCampaign.discount_value}% discount code
                    </span>
                  </>
                ) : activeCampaign ? (
                  "Help others discover MyDayLogs and save on their first month!"
                ) : (
                  "Help spread the word about MyDayLogs by sharing with your network!"
                )}
              </p>

              <div className="flex justify-center gap-3 mb-6">
                <Button
                  onClick={() => trackSocialShare("facebook")}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
                <Button
                  onClick={() => trackSocialShare("twitter")}
                  className="bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  onClick={() => trackSocialShare("linkedin")}
                  className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Button>
              </div>

              <Button onClick={handleCloseModal} variant="outline" className="w-full sm:w-auto bg-transparent">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Send Feedback
              </DialogTitle>
              <DialogDescription>
                Help us improve MyDayLogs! Share your thoughts, suggestions, or report issues.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Your Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your feedback"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="feedback">Your Message *</Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us what you think, what could be improved, or any features you'd like to see..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  required
                  className="min-h-[120px] border-2 border-gray-300 focus:border-accent bg-white dark:bg-gray-50 dark:text-gray-900"
                />
              </div>

              <div>
                <Label>Screenshots (optional)</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto"
                    disabled={attachments.length >= 3}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Screenshots (Max 3)
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="ml-2 h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload screenshots to help us understand your feedback better. Max 5MB per file.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!feedback.trim() || !name.trim() || isSubmitting}
                  className="bg-accent hover:bg-accent/90 w-full sm:w-auto"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

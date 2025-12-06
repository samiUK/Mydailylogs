"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface FeedbackModalProps {
  isOpen?: boolean
  onClose?: (open: boolean) => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [open, setOpen] = useState(isOpen || false)
  const [subject, setSubject] = useState("Feedback!")
  const [feedback, setFeedback] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [currentPage, setCurrentPage] = useState("")
  const [activeCampaign, setActiveCampaign] = useState<{
    promo_code: string
    discount_value: number
    discount_type: string
    id: string
    max_redemptions: number
    requirement_type: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [hasShared, setHasShared] = useState(false)
  const [issuedPromoCode, setIssuedPromoCode] = useState<string | null>(null)
  const [isIssuingCode, setIsIssuingCode] = useState(false)

  const requiresSocialShare =
    activeCampaign?.requirement_type === "feedback_and_share" || activeCampaign?.requirement_type === "share_only"
  const requiresFeedback =
    activeCampaign?.requirement_type === "feedback_and_share" || activeCampaign?.requirement_type === "feedback_only"
  const isAutoPromo =
    activeCampaign?.requirement_type === "first_time_user" || activeCampaign?.requirement_type === "none"

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPage(window.location.href)
    }
  }, [])

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setCurrentPage(window.location.href)
    }
  }, [open])

  useEffect(() => {
    if (feedbackSubmitted) {
      fetchActiveCampaign()
    }
  }, [feedbackSubmitted])

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
    if (!feedback.trim() || !name.trim() || !email.trim()) return

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
        email: email.trim(),
        subject: subject || "Feedback!",
        message: feedback.trim(),
        page_url: currentPage,
        attachments: attachmentData,
        user_id: user?.id || null,
        organization_id: organizationId,
        status: "unread",
      }

      const { data: insertedFeedback, error: feedbackError } = await supabase
        .from("feedback")
        .insert(feedbackData)
        .select()
        .single()

      if (feedbackError) {
        console.error("[v0] Failed to save feedback:", feedbackError)
        throw feedbackError
      }

      console.log("[v0] Feedback saved successfully:", insertedFeedback.id)
      setFeedbackId(insertedFeedback.id)

      setFeedbackSubmitted(true)

      if (activeCampaign && !requiresSocialShare) {
        console.log("[v0] Auto-issuing code for non-share campaign")
        setIsIssuingCode(true)

        const codeResponse = await fetch("/api/promo-campaign/issue-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaignId: activeCampaign.id,
            feedbackId: insertedFeedback.id,
            socialSharePlatform: null,
            userEmail: email.trim(),
          }),
        })

        if (codeResponse.ok) {
          const { promoCode } = await codeResponse.json()
          console.log("[v0] Promo code auto-issued:", promoCode)
          setIssuedPromoCode(promoCode)
          setHasShared(true)
        }
        setIsIssuingCode(false)
      }
    } catch (error) {
      console.error("[v0] Error submitting feedback:", error)
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

      const userEmail = email.trim()

      if (!userEmail) {
        console.error("[v0] No user email found")
        return
      }

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

      if (platformUrl) {
        window.open(platformUrl, "_blank", "noopener,noreferrer")
      }

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
          userEmail,
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
            userEmail,
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

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen)
    }
  }, [isOpen])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onClose) {
      onClose(newOpen)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {!feedbackSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Send Feedback
              </DialogTitle>
              <DialogDescription>
                Help us improve MyDayLogs! Share your thoughts, suggestions, or report issues.
              </DialogDescription>
            </DialogHeader>

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
                <Label htmlFor="email">Your Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} type="button">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!feedback.trim() || !name.trim() || !email.trim() || isSubmitting}
                className="bg-accent hover:bg-accent/90 w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-lg font-semibold text-emerald-700">Feedback Submitted!</h4>
              </div>
              <p className="text-sm text-gray-700">Thank you for your feedback. We appreciate your input!</p>
            </div>

            {activeCampaign && requiresSocialShare && !hasShared && (
              <>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🎁</span>
                    <h4 className="text-lg font-bold text-amber-700">One More Step!</h4>
                    <span className="text-2xl">🎁</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3 text-center">
                    Share MyDayLogs on social media to unlock your exclusive {activeCampaign.discount_value}% discount
                    code!
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Share2 className="w-5 h-5 text-accent" />
                    <h4 className="text-lg font-semibold text-gray-700">Share to Unlock Your Code!</h4>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Click any button below to share MyDayLogs and{" "}
                    <span className="font-semibold text-emerald-600">
                      unlock your {activeCampaign.discount_value}% discount code
                    </span>
                  </p>

                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={() => trackSocialShare("facebook")}
                      disabled={isIssuingCode}
                      className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                    >
                      <Facebook className="w-5 h-5 mr-2" />
                      Facebook
                    </Button>
                    <Button
                      onClick={() => trackSocialShare("twitter")}
                      disabled={isIssuingCode}
                      className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white"
                    >
                      <Twitter className="w-5 h-5 mr-2" />
                      Twitter
                    </Button>
                    <Button
                      onClick={() => trackSocialShare("linkedin")}
                      disabled={isIssuingCode}
                      className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
                    >
                      <Linkedin className="w-5 h-5 mr-2" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </>
            )}

            {issuedPromoCode && hasShared && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                  <h4 className="text-xl font-bold text-emerald-700">Your Discount Code is Ready!</h4>
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>

                <div className="bg-white border-2 border-emerald-400 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-2xl font-mono font-bold text-emerald-600">{issuedPromoCode}</code>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(issuedPromoCode)
                        alert("Promo code copied to clipboard!")
                      }}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 text-center mb-2">
                  <strong className="text-emerald-700">Save this code!</strong> Use it at checkout to get{" "}
                  {activeCampaign?.discount_value}% off your first month.
                </p>
                <p className="text-xs text-gray-500 text-center">
                  This code is unique to you and can only be used once.
                </p>
              </div>
            )}

            {(hasShared || (!requiresSocialShare && feedbackSubmitted)) && (
              <div className="flex justify-center">
                <Button onClick={onClose} className="bg-accent hover:bg-accent/90">
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

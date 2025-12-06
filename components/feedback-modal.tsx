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
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Sparkles,
  CheckCircle2,
  Share2,
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
  const [shareStage, setShareStage] = useState<"warning" | "sharing">("warning")

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

  useEffect(() => {
    if (open) {
      fetchActiveCampaign()
    }
  }, [open])

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

            {activeCampaign && requiresSocialShare && !hasShared && shareStage === "warning" && (
              <div className="space-y-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 rounded-xl p-6 shadow-lg">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl animate-bounce">🎁</span>
                    <h3 className="text-2xl font-bold text-amber-800">Unlock Your Discount!</h3>
                    <span className="text-3xl animate-bounce">🎁</span>
                  </div>
                  <p className="text-lg font-semibold text-amber-700">
                    Get {activeCampaign.discount_value}% off by sharing MyDayLogs
                  </p>
                </div>

                <div className="bg-white border-2 border-amber-500 rounded-lg p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-base font-bold text-amber-800 mb-2">⚠️ Important: Share to Activate Code</h5>
                      <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside">
                        <li className="font-semibold">
                          Your discount code will ONLY work if you share on social media
                        </li>
                        <li>We'll provide a pre-written message for one-click sharing</li>
                        <li>After sharing, your exclusive code will appear instantly</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShareStage("sharing")}
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-lg py-6 shadow-lg hover:shadow-xl transition-all"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Continue to Share & Get Code
                </Button>
              </div>
            )}

            {activeCampaign && requiresSocialShare && !hasShared && shareStage === "sharing" && (
              <div className="space-y-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-400 rounded-xl p-6 shadow-lg">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-blue-800">Share to Unlock Your Code</h3>
                  <p className="text-base text-blue-700">Click any button below - we've written the message for you!</p>
                </div>

                <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">📝 Your pre-written share message:</p>
                  <p className="text-sm text-gray-800 italic leading-relaxed">
                    "I'm using MyDayLogs to streamline my work! {activeCampaign.discount_value}% off for new users -
                    submit feedback to get your code!"
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={() => trackSocialShare("facebook")}
                      disabled={isIssuingCode}
                      size="lg"
                      className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white shadow-lg hover:shadow-xl transition-all py-6 text-base"
                    >
                      <Facebook className="w-5 h-5 mr-2" />
                      Share on Facebook
                    </Button>
                    <Button
                      onClick={() => trackSocialShare("twitter")}
                      disabled={isIssuingCode}
                      size="lg"
                      className="w-full bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white shadow-lg hover:shadow-xl transition-all py-6 text-base"
                    >
                      <Twitter className="w-5 h-5 mr-2" />
                      Share on Twitter
                    </Button>
                    <Button
                      onClick={() => trackSocialShare("linkedin")}
                      disabled={isIssuingCode}
                      size="lg"
                      className="w-full bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white shadow-lg hover:shadow-xl transition-all py-6 text-base"
                    >
                      <Linkedin className="w-5 h-5 mr-2" />
                      Share on LinkedIn
                    </Button>
                  </div>

                  {isIssuingCode && (
                    <div className="flex items-center justify-center gap-2 text-blue-700 py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                      <p className="text-sm font-medium">Generating your exclusive code...</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShareStage("warning")}
                  disabled={isIssuingCode}
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            )}

            {activeCampaign && !requiresSocialShare && feedbackSubmitted && issuedPromoCode && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-xl p-6 shadow-lg">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                      <h3 className="text-2xl font-bold text-emerald-700">Your Code is Ready!</h3>
                      <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                    </div>

                    <div className="bg-white border-3 border-emerald-500 rounded-lg p-6 shadow-xl">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Your Exclusive Discount Code:</p>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <code className="text-3xl font-mono font-bold text-emerald-600 tracking-wider bg-emerald-50 px-4 py-2 rounded border-2 border-emerald-300">
                          {issuedPromoCode}
                        </code>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(issuedPromoCode)
                            alert("✅ Promo code copied to clipboard!")
                          }}
                          size="lg"
                          variant="outline"
                          className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white border border-emerald-300 rounded-lg p-4 space-y-2">
                      <p className="text-base font-semibold text-emerald-800">
                        💚 Save this code and use it at checkout!
                      </p>
                      <p className="text-sm text-gray-700">
                        Get <strong className="text-emerald-700">{activeCampaign?.discount_value}% off</strong> your
                        first month
                      </p>
                      <p className="text-xs text-gray-500 italic">
                        This code is unique to you and can only be used once. Keep it safe!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border border-blue-300 rounded-xl p-5 shadow">
                  <div className="text-center space-y-3">
                    <h4 className="text-lg font-semibold text-blue-800">💙 Love MyDayLogs? Share the word!</h4>
                    <p className="text-sm text-blue-700">Help others discover us (optional)</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <Button
                      onClick={() => {
                        const shareMessage = `I'm using MyDayLogs to streamline my work! ${activeCampaign.discount_value}% off for new users - submit feedback to get your code!`
                        const shareUrl =
                          typeof window !== "undefined" ? window.location.origin : "https://mydaylogs.co.uk"
                        const platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`
                        window.open(platformUrl, "_blank", "noopener,noreferrer")
                      }}
                      size="sm"
                      variant="outline"
                      className="border-[#1877F2] text-[#1877F2] hover:bg-blue-50"
                    >
                      <Facebook className="w-4 h-4 mr-1" />
                      Facebook
                    </Button>
                    <Button
                      onClick={() => {
                        const shareMessage = `I'm using MyDayLogs to streamline my work! ${activeCampaign.discount_value}% off for new users - submit feedback to get your code!`
                        const shareUrl =
                          typeof window !== "undefined" ? window.location.origin : "https://mydaylogs.co.uk"
                        const platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`
                        window.open(platformUrl, "_blank", "noopener,noreferrer")
                      }}
                      size="sm"
                      variant="outline"
                      className="border-[#1DA1F2] text-[#1DA1F2] hover:bg-blue-50"
                    >
                      <Twitter className="w-4 h-4 mr-1" />
                      Twitter
                    </Button>
                    <Button
                      onClick={() => {
                        const shareMessage = `I'm using MyDayLogs to streamline my work! ${activeCampaign.discount_value}% off for new users - submit feedback to get your code!`
                        const shareUrl =
                          typeof window !== "undefined" ? window.location.origin : "https://mydaylogs.co.uk"
                        const platformUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
                        window.open(platformUrl, "_blank", "noopener,noreferrer")
                      }}
                      size="sm"
                      variant="outline"
                      className="border-[#0A66C2] text-[#0A66C2] hover:bg-blue-50"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {issuedPromoCode && hasShared && requiresSocialShare && (
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-xl p-6 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                    <h3 className="text-2xl font-bold text-emerald-700">Success! Your Code is Ready</h3>
                    <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                  </div>

                  <div className="bg-white border-3 border-emerald-500 rounded-lg p-6 shadow-xl">
                    <p className="text-sm text-gray-600 mb-2 font-medium">Your Exclusive Discount Code:</p>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <code className="text-3xl font-mono font-bold text-emerald-600 tracking-wider bg-emerald-50 px-4 py-2 rounded border-2 border-emerald-300">
                        {issuedPromoCode}
                      </code>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(issuedPromoCode)
                          alert("✅ Promo code copied to clipboard!")
                        }}
                        size="lg"
                        variant="outline"
                        className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-300 rounded-lg p-4 space-y-2">
                    <p className="text-base font-semibold text-emerald-800">
                      💚 Save this code and use it at checkout!
                    </p>
                    <p className="text-sm text-gray-700">
                      Get <strong className="text-emerald-700">{activeCampaign?.discount_value}% off</strong> your first
                      month
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      This code is unique to you and can only be used once. Keep it safe!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {((feedbackSubmitted && issuedPromoCode) || !activeCampaign) && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => handleOpenChange(false)}
                  size="lg"
                  className="bg-accent hover:bg-accent/90 min-w-[200px]"
                >
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

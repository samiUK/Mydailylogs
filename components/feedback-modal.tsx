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
import { MessageSquare, Send, X, Upload, Trash2, CheckCircle, Share2, Facebook, Twitter, Linkedin } from "lucide-react"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      // Get current user if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Current user:", user?.id || "Anonymous")

      // Prepare attachment data
      const attachmentData = attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))

      const feedbackData = {
        name: name.trim(),
        email: email.trim() || "Anonymous",
        subject: subject || "Feedback!",
        message: feedback.trim(),
        page_url: currentPage,
        attachments: attachmentData,
        user_id: user?.id || null,
        status: "unread",
      }

      console.log("[v0] Feedback data to insert:", feedbackData)

      const { error: dbError, data: insertedData } = await supabase.from("feedback").insert(feedbackData).select()

      console.log("[v0] Database insert result:", { error: dbError, data: insertedData })

      if (dbError) {
        console.error("[v0] Database error:", dbError)
        throw new Error(`Failed to save feedback: ${dbError.message}`)
      }

      console.log("[v0] Feedback successfully saved to database")
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

  const shareOnFacebook = () => {
    const message =
      "Hey I found this amazing tool for Task management and Team reporting for Multi-Industry Businesses, Check them out"
    const url = "https://mydaylogs.co.uk"
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`,
      "_blank",
    )
  }

  const shareOnTwitter = () => {
    const message =
      "Hey I found this amazing tool for Task management and Team reporting for Multi-Industry Businesses, Check them out"
    const url = "https://mydaylogs.co.uk"
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(`${message} ${url}`)}`, "_blank")
  }

  const shareOnLinkedIn = () => {
    const url = "https://mydaylogs.co.uk"
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank")
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
              <div className="flex items-center justify-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-accent" />
                <h4 className="text-lg font-semibold text-gray-700">Help us grow!</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Love MyDayLogs? Share it with your network and help other businesses discover our platform.
              </p>

              <div className="flex justify-center gap-3 mb-6">
                <Button
                  onClick={shareOnFacebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
                <Button
                  onClick={shareOnTwitter}
                  className="bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  onClick={shareOnLinkedIn}
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

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquare, Trash2, Mail, ChevronLeft, ChevronRight } from "lucide-react"

interface Feedback {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  created_at: string
  response?: string
}

interface FeedbackSectionProps {
  feedback: Feedback[]
  setFeedback: (feedback: Feedback[]) => void
  unreadFeedbackCount: number
  setUnreadFeedbackCount: (count: number | ((prev: number) => number)) => void
  onMarkAsRead: (feedbackId: string) => Promise<void>
  onDelete: (feedbackId: string) => Promise<void>
  onSendResponse: (to: string, subject: string, message: string) => Promise<void>
}

export function FeedbackSection({
  feedback,
  setFeedback,
  unreadFeedbackCount,
  setUnreadFeedbackCount,
  onMarkAsRead,
  onDelete,
  onSendResponse,
}: FeedbackSectionProps) {
  const [feedbackSearchTerm, setFeedbackSearchTerm] = useState("")
  const [feedbackPage, setFeedbackPage] = useState(1)
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; feedback: Feedback | null }>({
    isOpen: false,
    feedback: null,
  })
  const [responseSubject, setResponseSubject] = useState("")
  const [responseMessage, setResponseMessage] = useState("")
  const [isSendingResponse, setIsSendingResponse] = useState(false)

  const feedbackPerPage = 10

  const filteredFeedback = feedback.filter(
    (item) =>
      item.name.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
      item.subject.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
      item.message.toLowerCase().includes(feedbackSearchTerm.toLowerCase()),
  )

  const paginatedFeedback = filteredFeedback.slice((feedbackPage - 1) * feedbackPerPage, feedbackPage * feedbackPerPage)

  const totalFeedbackPages = Math.ceil(filteredFeedback.length / feedbackPerPage)

  const openResponseModal = (feedbackItem: Feedback) => {
    setResponseModal({ isOpen: true, feedback: feedbackItem })
    setResponseSubject(`Re: ${feedbackItem.subject}`)
    setResponseMessage(`Hi ${feedbackItem.name},\n\nThank you for your feedback. `)
  }

  const closeResponseModal = () => {
    setResponseModal({ isOpen: false, feedback: null })
    setResponseSubject("")
    setResponseMessage("")
  }

  const sendResponse = async () => {
    if (!responseModal.feedback) return
    setIsSendingResponse(true)
    try {
      await onSendResponse(responseModal.feedback.email, responseSubject, responseMessage)
      await onMarkAsRead(responseModal.feedback.id)
      closeResponseModal()
    } catch (error) {
      console.error("Failed to send response:", error)
      alert("Failed to send response")
    } finally {
      setIsSendingResponse(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback ({filteredFeedback.length})
            {unreadFeedbackCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadFeedbackCount} unread
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Customer feedback and inquiries</CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Search by name, email, subject, or message..."
              value={feedbackSearchTerm}
              onChange={(e) => setFeedbackSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No feedback found matching your search</div>
            ) : (
              paginatedFeedback.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.status === "unread" ? "bg-blue-50 border-blue-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{item.subject}</h3>
                        <Badge variant={item.status === "unread" ? "default" : "secondary"}>{item.status}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        From: {item.name} ({item.email})
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => openResponseModal(item)} size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-1" />
                        Reply
                      </Button>
                      <Button onClick={() => onDelete(item.id)} size="sm" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{item.message}</div>
                </div>
              ))
            )}
          </div>

          {totalFeedbackPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                onClick={() => setFeedbackPage((prev) => Math.max(1, prev - 1))}
                disabled={feedbackPage === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {feedbackPage} of {totalFeedbackPages}
              </span>
              <Button
                onClick={() => setFeedbackPage((prev) => Math.min(totalFeedbackPages, prev + 1))}
                disabled={feedbackPage === totalFeedbackPages}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={responseModal.isOpen} onOpenChange={closeResponseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Response</DialogTitle>
            <DialogDescription>Reply to feedback from {responseModal.feedback?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input value={responseSubject} onChange={(e) => setResponseSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={closeResponseModal} variant="outline">
                Cancel
              </Button>
              <Button onClick={sendResponse} disabled={isSendingResponse}>
                {isSendingResponse ? "Sending..." : "Send Response"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

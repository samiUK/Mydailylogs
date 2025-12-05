"use client"

import { useState } from "react"
import type { Feedback } from "./types"
import { Button } from "@/components/ui/button"

interface FeedbackResponseModalProps {
  feedback: Feedback | null
  onClose: () => void
  onSubmit: (feedbackId: string, response: string) => void
}

export function FeedbackResponseModal({ feedback, onClose, onSubmit }: FeedbackResponseModalProps) {
  const [response, setResponse] = useState("")

  if (!feedback) return null

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit(feedback.id, response)
      setResponse("")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Respond to Feedback</h3>

        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-900 rounded">
          <p className="text-sm font-semibold mb-1">{feedback.user_email}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.message}</p>
        </div>

        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response..."
          className="w-full h-32 px-4 py-2 border rounded-lg resize-none"
        />

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!response.trim()}>
            Send Response
          </Button>
        </div>
      </div>
    </div>
  )
}

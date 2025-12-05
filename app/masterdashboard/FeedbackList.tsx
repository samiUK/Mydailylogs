"use client"

import { useState } from "react"
import type { Feedback } from "./types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Mail, Trash2 } from "lucide-react"

interface FeedbackListProps {
  feedback: Feedback[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onRespond: (feedback: Feedback) => void
  onDelete: (feedbackId: string) => Promise<void>
  onRefresh: () => void
}

export function FeedbackList({
  feedback,
  searchTerm,
  onSearchChange,
  onRespond,
  onDelete,
  onRefresh,
}: FeedbackListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const filteredFeedback = feedback.filter(
    (item) =>
      item.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback? This action cannot be undone.")) {
      return
    }
    setDeleting(feedbackId)
    await onDelete(feedbackId)
    setDeleting(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "read":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return "🐛"
      case "feature":
        return "✨"
      case "question":
        return "❓"
      case "other":
        return "💬"
      default:
        return "📝"
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Feedback ({feedback.length})</h2>
      </div>
      <p className="text-gray-600 mb-6">User feedback and support requests</p>

      <div className="flex gap-4 mb-6">
        <Input
          type="text"
          placeholder="Search by name, email, subject, or message..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        <Button onClick={onRefresh} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Feedback Cards */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            No feedback found matching your search
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(item.type)}</span>
                  <div>
                    <h3 className="font-semibold capitalize">{item.type} Feedback</h3>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => onRespond(item)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">From:</span> {item.name || "Anonymous"} ({item.email})
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Subject:</span> {item.subject || "No subject"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Submitted:</span> {new Date(item.created_at).toLocaleString("en-GB")}
                </p>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{item.message}</p>
              </div>

              {item.admin_response && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 mb-1">Admin Response:</p>
                  <p className="text-sm text-green-900">{item.admin_response}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Responded: {new Date(item.updated_at).toLocaleString("en-GB")}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

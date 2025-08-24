"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { FeedbackModal } from "@/components/feedback-modal"

export function FeedbackBanner() {
  const deploymentDate = new Date("2024-12-24")
  const currentDate = new Date()
  const daysSinceDeployment = Math.floor((currentDate.getTime() - deploymentDate.getTime()) / (1000 * 60 * 60 * 24))
  const showBanner = daysSinceDeployment <= 90

  if (!showBanner) return null

  return (
    <div className="bg-accent text-accent-foreground py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>🚀 You're using the Beta version of MyDayLogs. Things may change, and we'd love your feedback!</span>
        </div>
        <FeedbackModal
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="text-accent-foreground hover:bg-accent-foreground/20 h-8 px-4 text-sm font-medium border border-accent-foreground/30 hover:border-accent-foreground/50 transition-all duration-200 hover:scale-105 hover:shadow-md bg-accent-foreground/10 hover:bg-accent-foreground/20"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Give Feedback
            </Button>
          }
        />
      </div>
    </div>
  )
}

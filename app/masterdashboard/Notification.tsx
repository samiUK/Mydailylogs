"use client"

import type { NotificationState } from "./types"

interface NotificationProps {
  notification: NotificationState
  onClose: () => void
}

export function Notification({ notification, onClose }: NotificationProps) {
  if (!notification.show) return null

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[notification.type]

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md`}>
      <div className="flex items-center justify-between gap-4">
        <p>{notification.message}</p>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          ×
        </button>
      </div>
    </div>
  )
}

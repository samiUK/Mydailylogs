"use client"

import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react"

interface NotificationToastProps {
  show: boolean
  message: string
  type: "success" | "error" | "warning" | "info"
  onClose: () => void
}

export function NotificationToast({ show, message, type, onClose }: NotificationToastProps) {
  if (!show) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 max-w-md ${
        type === "success"
          ? "bg-green-50 border-green-500 text-green-800"
          : type === "error"
            ? "bg-red-50 border-red-500 text-red-800"
            : type === "warning"
              ? "bg-yellow-50 border-yellow-500 text-yellow-800"
              : "bg-blue-50 border-blue-500 text-blue-800"
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {type === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
          {type === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
          {type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
          {type === "info" && <Info className="w-5 h-5 text-blue-500" />}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

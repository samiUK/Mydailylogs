"use client"

import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  show: boolean
  title: string
  message: string
  type?: "warning" | "danger"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ show, title, message, type = "warning", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className={`w-6 h-6 mr-3 ${type === "danger" ? "text-red-500" : "text-yellow-500"}`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              type === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

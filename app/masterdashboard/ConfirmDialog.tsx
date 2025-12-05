"use client"

import type { ConfirmDialogState } from "./types"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  dialog: ConfirmDialogState
  onClose: () => void
}

export function ConfirmDialog({ dialog, onClose }: ConfirmDialogProps) {
  if (!dialog.show) return null

  const handleConfirm = () => {
    dialog.onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{dialog.title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{dialog.message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={dialog.type === "danger" ? "destructive" : "default"} onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

import type React from "react"
// UI Helper functions extracted from masterdashboard

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift()
}

export interface NotificationState {
  type: "success" | "error" | "warning" | "info"
  message: string
  show: boolean
}

export interface ConfirmDialogState {
  show: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  type: "warning" | "danger"
}

export function createNotificationHelper(setNotification: React.Dispatch<React.SetStateAction<NotificationState>>) {
  return (type: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }))
    }, 5000)
  }
}

export function createConfirmDialogHelper(setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>) {
  return (title: string, message: string, onConfirm: () => void, type: "warning" | "danger" = "warning") => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm,
      onCancel: () => setConfirmDialog((prev) => ({ ...prev, show: false })),
      type,
    })
  }
}

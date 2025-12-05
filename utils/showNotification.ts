import { toast } from "sonner"

export function showNotification(message: string, type: "success" | "error" | "info" | "warning" = "info") {
  switch (type) {
    case "success":
      toast.success(message)
      break
    case "error":
      toast.error(message)
      break
    case "warning":
      toast.warning(message)
      break
    case "info":
    default:
      toast.info(message)
      break
  }
}

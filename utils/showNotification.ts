import { toast } from "@/hooks/use-toast"

export function showNotification(message: string, type: "success" | "error" | "info" | "warning" = "info") {
  const variant = type === "error" ? "destructive" : "default"

  toast({
    title: type.charAt(0).toUpperCase() + type.slice(1),
    description: message,
    variant,
  })
}

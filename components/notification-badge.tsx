"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatRelativeTime } from "@/lib/date-formatter"

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
  template_id?: string
  profiles: {
    first_name: string
    last_name: string
  }
}

export function NotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    loadNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("notifications")
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()

    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

    await loadNotifications()
  }

  const markAllAsRead = async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)

    await loadNotifications()
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.type === "assignment" && notification.template_id) {
      router.push("/staff")
    } else if (notification.type === "submission") {
      router.push("/admin/reports/submitted")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <p className={`text-sm ${!notification.is_read ? "font-semibold" : ""}`}>{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.created_at)}</p>
                </div>
                {!notification.is_read && <div className="h-2 w-2 rounded-full bg-blue-500 ml-2 mt-1" />}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

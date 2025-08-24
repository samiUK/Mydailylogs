"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Mail, Send, Users, Clock } from "lucide-react"

export default function NotificationsPage() {
  const [users, setUsers] = useState([])
  const [emailData, setEmailData] = useState({
    type: "custom",
    to: "",
    subject: "",
    message: "",
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    }
  }

  const sendEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      toast.error("Please fill in all required fields")
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          to: emailData.to,
          data: {
            subject: emailData.subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1DB584;">MyDayLogs Notification</h2>
              ${emailData.message.replace(/\n/g, "<br>")}
              <p>Best regards,<br>The MyDayLogs Team</p>
            </div>`,
            text: emailData.message,
          },
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success("Email sent successfully!")
        setEmailData({ type: "custom", to: "", subject: "", message: "" })
      } else {
        toast.error("Failed to send email: " + result.error)
      }
    } catch (error) {
      console.error("[v0] Email sending error:", error)
      toast.error("Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const sendWelcomeEmail = async (userId: string) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          userId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success("Welcome email sent!")
      } else {
        toast.error("Failed to send welcome email")
      }
    } catch (error) {
      toast.error("Failed to send welcome email")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Notifications</h1>
        <p className="text-muted-foreground">Send emails to users and manage notification settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Send Custom Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Custom Email
            </CardTitle>
            <CardDescription>Send a custom email to users or staff members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient</Label>
              <Select value={emailData.to} onValueChange={(value) => setEmailData({ ...emailData, to: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                placeholder="Email message"
                rows={6}
              />
            </div>

            <Button onClick={sendEmail} disabled={sending} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Send predefined emails to users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Welcome Emails</h4>
              <p className="text-sm text-muted-foreground">Send welcome emails to new users</p>
              {users.slice(0, 3).map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{user.full_name}</span>
                  <Button size="sm" variant="outline" onClick={() => sendWelcomeEmail(user.id)}>
                    Send Welcome
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Task Reminders</h4>
              <p className="text-sm text-muted-foreground">Send reminders for overdue tasks</p>
              <Button variant="outline" className="w-full bg-transparent">
                <Clock className="h-4 w-4 mr-2" />
                Send Overdue Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>Configure your SMTP settings and email preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>SMTP Server</Label>
              <p className="text-sm text-muted-foreground">smtp.supabase.co</p>
            </div>
            <div>
              <Label>From Address</Label>
              <p className="text-sm text-muted-foreground">info@mydaylogs.co.uk</p>
            </div>
            <div>
              <Label>Port</Label>
              <p className="text-sm text-muted-foreground">587 (TLS)</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-sm text-green-600">✓ Connected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

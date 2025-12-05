"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Trash2, RefreshCw } from "lucide-react"

interface Superuser {
  id: string
  email: string
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  target_email: string
  performed_by: string
  created_at: string
  details: string
}

interface SuperuserToolsSectionProps {
  superusers: Superuser[]
  onAddSuperuser: (email: string, password: string) => Promise<void>
  onRemoveSuperuser: (id: string) => Promise<void>
  onUpdateSuperuser: (id: string, password: string) => Promise<void>
}

export function SuperuserToolsSection({
  superusers,
  onAddSuperuser,
  onRemoveSuperuser,
  onUpdateSuperuser,
}: SuperuserToolsSectionProps) {
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [editingSuperuser, setEditingSuperuser] = useState<Superuser | null>(null)
  const [editPassword, setEditPassword] = useState("")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchAuditLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/master/superuser-audit-log")
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs || [])
      }
    } catch (error) {
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const handleAdd = async () => {
    if (!newEmail || !newPassword) return
    await onAddSuperuser(newEmail, newPassword)
    setNewEmail("")
    setNewPassword("")
    fetchAuditLogs()
  }

  const handleUpdate = async () => {
    if (!editingSuperuser || !editPassword) return
    await onUpdateSuperuser(editingSuperuser.id, editPassword)
    setEditingSuperuser(null)
    setEditPassword("")
    fetchAuditLogs()
  }

  const handleRemove = async (id: string) => {
    await onRemoveSuperuser(id)
    fetchAuditLogs()
  }

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="bg-red-100/50">
          <CardTitle className="text-red-600">Superuser Management</CardTitle>
          <CardDescription>Manage superuser accounts - Add, update, or remove superusers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Add New Superuser */}
          <div className="p-4 border border-red-200 rounded-lg bg-white">
            <h3 className="text-sm font-semibold mb-4 text-red-900">Add New Superuser</h3>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={handleAdd} className="w-full bg-red-600 hover:bg-red-700 text-white">
                Add Superuser
              </Button>
            </div>
          </div>

          {/* Existing Superusers */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Existing Superusers ({superusers.length})</h3>
            {superusers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border rounded-lg bg-white">No superusers found</p>
            ) : (
              <div className="space-y-2">
                {superusers.map((superuser) => (
                  <div key={superuser.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium">{superuser.email}</p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(superuser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => setEditingSuperuser(superuser)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleRemove(superuser.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="bg-blue-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-600">Audit Log</CardTitle>
              <CardDescription>Track all superuser management actions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={loadingLogs}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 border rounded-lg bg-white">No audit logs found</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                            log.action === "add"
                              ? "bg-green-100 text-green-700"
                              : log.action === "remove"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                        {log.target_email}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">By: {log.performed_by}</p>
                      {log.details && <p className="text-xs text-gray-500 mt-1 italic">{log.details}</p>}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {new Date(log.created_at).toLocaleDateString()}{" "}
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingSuperuser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Update Superuser Password</h3>
            <p className="text-sm text-gray-600 mb-4">{editingSuperuser.email}</p>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingSuperuser(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="flex-1 bg-red-600 hover:bg-red-700">
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

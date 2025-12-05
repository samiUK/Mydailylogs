"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Plus, Trash2, Edit2, Save, X, Shield } from "lucide-react"

interface Superuser {
  id: string
  email: string
  role: string
  created_at: string
}

interface SuperuserSectionProps {
  superusers: Superuser[]
  currentUserRole: string
  activityLogs: any[]
  activityLogsLoading: boolean
  onAddSuperuser: (email: string, password: string) => Promise<void>
  onRemoveSuperuser: (id: string) => Promise<void>
  onUpdateSuperuser: (id: string, password: string) => Promise<void>
}

export function SuperuserSection({
  superusers,
  currentUserRole,
  activityLogs,
  activityLogsLoading,
  onAddSuperuser,
  onRemoveSuperuser,
  onUpdateSuperuser,
}: SuperuserSectionProps) {
  const [newSuperuserEmail, setNewSuperuserEmail] = useState("")
  const [newSuperuserPassword, setNewSuperuserPassword] = useState("")
  const [editingSuperuser, setEditingSuperuser] = useState<Superuser | null>(null)

  const handleAddSuperuser = async () => {
    if (!newSuperuserEmail || !newSuperuserPassword) {
      alert("Please provide both email and password")
      return
    }

    try {
      await onAddSuperuser(newSuperuserEmail, newSuperuserPassword)
      setNewSuperuserEmail("")
      setNewSuperuserPassword("")
    } catch (error) {
      console.error("Failed to add superuser:", error)
    }
  }

  const handleUpdateSuperuser = async () => {
    if (!editingSuperuser || !newSuperuserPassword) {
      alert("Please provide a new password")
      return
    }

    try {
      await onUpdateSuperuser(editingSuperuser.id, newSuperuserPassword)
      setEditingSuperuser(null)
      setNewSuperuserPassword("")
    } catch (error) {
      console.error("Failed to update superuser:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-600 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Superuser Management
        </CardTitle>
        <CardDescription>Manage superuser accounts - Add, update, or remove superusers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add Superuser Section */}
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <h3 className="text-sm font-semibold mb-4 text-red-900">Add New Superuser</h3>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email address"
                value={newSuperuserEmail}
                onChange={(e) => setNewSuperuserEmail(e.target.value)}
                className="bg-white"
              />
              <Input
                type="password"
                placeholder="Password"
                value={newSuperuserPassword}
                onChange={(e) => setNewSuperuserPassword(e.target.value)}
                className="bg-white"
              />
              <Button onClick={handleAddSuperuser} className="w-full" variant="destructive">
                <Plus className="w-4 h-4 mr-2" />
                Add Superuser
              </Button>
            </div>
          </div>

          {/* Existing Superusers List */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Existing Superusers ({superusers.length})</h3>
            <div className="space-y-2">
              {superusers.map((superuser) => (
                <div key={superuser.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{superuser.email}</div>
                    <div className="text-xs text-gray-500">
                      Role: {superuser.role} • Added: {new Date(superuser.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingSuperuser?.id === superuser.id ? (
                      <>
                        <Input
                          type="password"
                          placeholder="New password"
                          value={newSuperuserPassword}
                          onChange={(e) => setNewSuperuserPassword(e.target.value)}
                          className="w-40"
                        />
                        <Button onClick={handleUpdateSuperuser} size="sm" variant="default">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingSuperuser(null)
                            setNewSuperuserPassword("")
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => setEditingSuperuser(superuser)}
                          size="sm"
                          variant="outline"
                          disabled={currentUserRole !== "masteradmin"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => onRemoveSuperuser(superuser.id)}
                          size="sm"
                          variant="destructive"
                          disabled={currentUserRole !== "masteradmin"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <h3 className="text-sm font-semibold mb-3 text-yellow-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recent Impersonation Activity
            </h3>
            {activityLogsLoading ? (
              <div className="text-sm text-gray-500">Loading activity logs...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-sm text-gray-500">No recent activity</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="text-xs p-2 bg-white rounded border">
                    <div className="font-medium">{log.action_type}</div>
                    <div className="text-gray-600">
                      Admin: {log.admin_email} → Target: {log.target_user_email || "N/A"}
                    </div>
                    <div className="text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import type { User } from "./types"
import { Button } from "@/components/ui/button"
import { Eye, Mail, Key, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserListProps {
  users: User[]
  onNotification: (message: string, type: "success" | "error") => void
}

export function UserList({ users, onNotification }: UserListProps) {
  const { toast } = useToast()
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handleGenerateLink = async (userId: string) => {
    setLoadingStates((prev) => ({ ...prev, [`link-${userId}`]: true }))
    try {
      const response = await fetch("/api/master/generate-user-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (data.success && data.link) {
        await navigator.clipboard.writeText(data.link)
        toast({
          title: "Link Generated",
          description: "Impersonation link copied to clipboard",
        })
        onNotification("Impersonation link copied to clipboard", "success")
      } else {
        throw new Error(data.error || "Failed to generate link")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate link",
        variant: "destructive",
      })
      onNotification(error instanceof Error ? error.message : "Failed to generate link", "error")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`link-${userId}`]: false }))
    }
  }

  const handleResendVerification = async (userId: string, email: string) => {
    setLoadingStates((prev) => ({ ...prev, [`verify-${userId}`]: true }))
    try {
      const response = await fetch("/api/master/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Verification Sent",
          description: `Verification email sent to ${email}`,
        })
        onNotification(`Verification email sent to ${email}`, "success")
      } else {
        throw new Error(data.error || "Failed to send verification")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification email",
        variant: "destructive",
      })
      onNotification(error instanceof Error ? error.message : "Failed to send verification email", "error")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`verify-${userId}`]: false }))
    }
  }

  const handleResetPassword = async (userEmail: string) => {
    setLoadingStates((prev) => ({ ...prev, [`reset-${userEmail}`]: true }))
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email")
      }

      toast({
        title: "Success",
        description: `Password reset email sent to ${userEmail}`,
      })
      onNotification(`Password reset email sent to ${userEmail}`, "success")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      })
      onNotification(error instanceof Error ? error.message : "Failed to reset password", "error")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`reset-${userEmail}`]: false }))
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${userName}? This action cannot be undone and will delete all user data (GDPR compliant).`,
      )
    ) {
      return
    }

    setLoadingStates((prev) => ({ ...prev, [`delete-${userId}`]: true }))
    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user")
      }

      toast({
        title: "Success",
        description: "User deleted successfully (GDPR compliant)",
      })
      onNotification("User deleted successfully (GDPR compliant)", "success")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
      onNotification(error instanceof Error ? error.message : "Failed to delete user", "error")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`delete-${userId}`]: false }))
    }
  }

  return (
    <div className="space-y-6 bg-green-50/30 p-6 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">All Users ({filteredUsers.length})</h2>
          <p className="text-sm text-gray-600">Manage all users across organizations</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by email, name, role, or organization..."
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-green-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Last Sign In
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No users found matching your search
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.full_name || "N/A"}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {user.role || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.organization_name || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateLink(user.id)}
                        disabled={loadingStates[`link-${user.id}`]}
                        className="text-xs h-8 px-2"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendVerification(user.id, user.email)}
                        disabled={loadingStates[`verify-${user.id}`]}
                        className="text-xs h-8 px-2"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(user.email)}
                        disabled={loadingStates[`reset-${user.email}`]}
                        className="text-xs h-8 px-2"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                        disabled={loadingStates[`delete-${user.id}`]}
                        className="text-xs h-8 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                )
              })}
              {totalPages > 5 && <span className="px-2">...</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

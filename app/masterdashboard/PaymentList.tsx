"use client"

import { useState } from "react"
import type { Payment } from "./types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DollarSign } from "lucide-react"

interface PaymentListProps {
  payments: Payment[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onRefund: (payment: Payment) => void
  onRefresh: () => void
}

export function PaymentList({ payments, searchTerm, onSearchChange, onRefund, onRefresh }: PaymentListProps) {
  const [refunding, setRefunding] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const filteredPayments = payments.filter(
    (payment) =>
      payment.amount.toString().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex)

  const handleSearchChange = (term: string) => {
    onSearchChange(term)
    setCurrentPage(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "refunded":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleRefund = (payment: Payment) => {
    setRefunding(payment.id)
    onRefund(payment)
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Payments ({payments.length})</h2>
      </div>
      <p className="text-gray-600 mb-6">Track all payment transactions</p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by amount, status, or organization..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No payments found matching your search
                </td>
              </tr>
            ) : (
              paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{payment.organization_name || "N/A"}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">
                    ${(payment.amount / 100).toFixed(2)} {payment.currency?.toUpperCase() || "USD"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(payment.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {payment.transaction_id?.substring(0, 20)}...
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payment.status === "succeeded" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefund(payment)}
                        disabled={refunding === payment.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {refunding === payment.id ? "Processing..." : "Issue Refund"}
                      </Button>
                    )}
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
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

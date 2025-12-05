"use client"

import { useState, useMemo } from "react"
import type { Payment } from "./types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Calendar, RefreshCw } from "lucide-react"
import { RefundDialog } from "@/components/refund-dialog"

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
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null,
  })
  const itemsPerPage = 20

  const revenueMetrics = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === "succeeded")
    const refunded = payments.filter((p) => p.status === "refunded")

    const totalRevenue = succeeded.reduce((sum, p) => sum + p.amount, 0) / 100
    const totalRefunded = refunded.reduce((sum, p) => sum + p.amount, 0) / 100
    const netRevenue = totalRevenue - totalRefunded

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthPayments = succeeded.filter((p) => new Date(p.created_at) >= firstDayOfMonth)
    const monthlyRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0) / 100

    const subscriptionPayments = succeeded.filter((p) => p.transaction_id?.startsWith("pi_"))
    const mrr =
      subscriptionPayments
        .filter((p) => new Date(p.created_at) >= firstDayOfMonth)
        .reduce((sum, p) => sum + p.amount, 0) / 100

    const currencyBreakdown = succeeded.reduce(
      (acc, p) => {
        const currency = p.currency?.toUpperCase() || "USD"
        const amount = p.amount / 100
        acc[currency] = (acc[currency] || 0) + amount
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalRevenue,
      netRevenue,
      totalRefunded,
      monthlyRevenue,
      mrr,
      currencyBreakdown,
      totalPayments: succeeded.length,
      refundedPayments: refunded.length,
    }
  }, [payments])

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
    setRefundDialog({ open: true, payment })
  }

  const handleConfirmRefund = async (paymentId: string, amount: number | undefined, reason: string) => {
    setRefunding(paymentId)
    try {
      await onRefund({ id: paymentId, amount, reason } as any)
      setRefundDialog({ open: false, payment: null })
    } finally {
      setRefunding(null)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Payments ({payments.length})</h2>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      <p className="text-gray-600 mb-6">Track all payment transactions and revenue metrics</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">£{revenueMetrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{revenueMetrics.totalPayments} successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">£{revenueMetrics.netRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              After £{revenueMetrics.totalRefunded.toFixed(2)} refunds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">£{revenueMetrics.monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Current billing period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">£{revenueMetrics.mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(revenueMetrics.currencyBreakdown).length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue by Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(revenueMetrics.currencyBreakdown).map(([currency, amount]) => (
                <div key={currency} className="flex items-center gap-2">
                  <Badge variant="outline">{currency}</Badge>
                  <span className="font-semibold">{amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by amount, status, or transaction ID..."
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

      <RefundDialog
        payment={refundDialog.payment}
        open={refundDialog.open}
        onOpenChange={(open) => setRefundDialog({ open, payment: open ? refundDialog.payment : null })}
        onConfirm={handleConfirmRefund}
      />
    </div>
  )
}

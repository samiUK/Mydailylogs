"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"
import type { Payment } from "@/app/masterdashboard/types"

interface RefundDialogProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (paymentId: string, amount: number | undefined, reason: string) => Promise<void>
}

export function RefundDialog({ payment, open, onOpenChange, onConfirm }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full")
  const [partialAmount, setPartialAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  if (!payment) return null

  const fullAmount = payment.amount / 100
  const maxAmount = fullAmount

  const handleConfirm = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      const refundAmount = refundType === "full" ? undefined : Number.parseFloat(partialAmount)

      if (refundType === "partial") {
        if (!partialAmount || isNaN(refundAmount!) || refundAmount! <= 0 || refundAmount! > maxAmount) {
          alert(`Please enter a valid amount between $0.01 and $${maxAmount.toFixed(2)}`)
          setIsProcessing(false)
          return
        }
      }

      await onConfirm(payment.id, refundAmount, reason)

      // Reset form
      setRefundType("full")
      setPartialAmount("")
      setReason("")
      onOpenChange(false)
    } catch (error) {
      console.error("Refund error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Process a refund for payment to {payment.organization_name || "Unknown Organization"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                Original Payment: ${fullAmount.toFixed(2)} {payment.currency?.toUpperCase() || "USD"}
              </p>
              <p className="text-blue-700">Transaction ID: {payment.transaction_id}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Refund Type</Label>
            <RadioGroup value={refundType} onValueChange={(value: "full" | "partial") => setRefundType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Refund (${fullAmount.toFixed(2)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Partial Refund
                </Label>
              </div>
            </RadioGroup>
          </div>

          {refundType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                placeholder={`Enter amount (max $${maxAmount.toFixed(2)})`}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Maximum refund amount: ${maxAmount.toFixed(2)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Warning:</strong> This action will process a refund through Stripe immediately. The customer will
              be notified by email.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
            {isProcessing ? "Processing..." : `Issue ${refundType === "full" ? "Full" : "Partial"} Refund`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

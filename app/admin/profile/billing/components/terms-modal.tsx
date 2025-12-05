"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsModalProps {
  open: boolean
  onClose: () => void
}

export function TermsModal({ open, onClose }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Payment Terms & Conditions</DialogTitle>
          <DialogDescription>Please review our transparent fee structure and payment terms</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">Payment Processing Fees</h3>
              <p className="text-muted-foreground mb-2">
                We partner with Stripe to process all payments securely. A payment processing fee is added to cover the
                cost of secure card transactions.
              </p>
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="font-medium">United Kingdom:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>UK domestic cards: 1.5% + £0.20 per transaction</li>
                  <li>EEA cards: 2.5% + £0.20 per transaction</li>
                  <li>International cards: 3.25% + £0.20 per transaction</li>
                </ul>
                <p className="font-medium mt-2">United States:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Domestic cards: 2.9% + $0.30 per transaction</li>
                  <li>International cards: Additional 1.5% fee applies</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">No Hidden Fees</h3>
              <p className="text-muted-foreground">
                All fees are clearly displayed before payment. Your checkout will show:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Subscription price</li>
                <li>Payment processing fee (separate line item)</li>
                <li>Total amount to be charged</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Non-Refundable Fees</h3>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-amber-900 dark:text-amber-100">
                  <strong>Important:</strong> Payment processing fees are non-refundable, even if you cancel your
                  subscription or request a refund. These fees cover the cost of the initial secure transaction and are
                  charged by Stripe, our payment processor.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">30-Day Free Trial</h3>
              <p className="text-muted-foreground">
                New customers receive a 30-day free trial with no payment required. You'll receive an email reminder 3
                days before your trial ends. Cancel anytime during the trial with no charges.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">
                We partner with Stripe, a PCI Level 1 certified payment processor, to ensure your payment data is always
                secure. We never store your complete card details, and all transactions are encrypted.
              </p>
            </section>
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button onClick={onClose}>I Understand</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

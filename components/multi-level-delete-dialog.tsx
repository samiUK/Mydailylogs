"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Clock, Lock } from "lucide-react"
import { reportSecurity } from "@/lib/report-security"

interface MultiLevelDeleteDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  itemName: string
  itemDetails?: Record<string, string>
  riskLevel: "low" | "medium" | "high" | "critical"
  onConfirm: () => Promise<void>
  requiresSecureSession?: boolean
}

export function MultiLevelDeleteDialog({
  trigger,
  title,
  description,
  itemName,
  itemDetails = {},
  riskLevel,
  onConfirm,
  requiresSecureSession = false,
}: MultiLevelDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [confirmText, setConfirmText] = useState("")
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [secureSession, setSecureSession] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setConfirmText("")
      setAcknowledgeRisk(false)
      setCountdown(getRiskCountdown(riskLevel))
      setSecureSession(null)

      // Create secure session for critical operations
      if (requiresSecureSession && riskLevel === "critical") {
        reportSecurity.createSecureSession().then(setSecureSession)
      }
    }
  }, [open, riskLevel, requiresSecureSession])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const getRiskCountdown = (risk: string) => {
    switch (risk) {
      case "critical":
        return 10
      case "high":
        return 5
      case "medium":
        return 3
      default:
        return 0
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      default:
        return "text-blue-600 bg-blue-50 border-blue-200"
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "medium":
        return <Shield className="h-5 w-5 text-yellow-500" />
      default:
        return <Shield className="h-5 w-5 text-blue-500" />
    }
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return true // Initial warning
      case 2:
        return confirmText.toUpperCase() === "DELETE" // Text confirmation
      case 3:
        return acknowledgeRisk // Risk acknowledgment
      case 4:
        return countdown === 0 // Countdown complete
      default:
        return false
    }
  }

  const handleNextStep = () => {
    if (canProceedToNextStep()) {
      if (currentStep < getMaxSteps()) {
        setCurrentStep(currentStep + 1)
      } else {
        handleFinalConfirm()
      }
    }
  }

  const getMaxSteps = () => {
    switch (riskLevel) {
      case "critical":
        return 4
      case "high":
        return 3
      case "medium":
        return 2
      default:
        return 1
    }
  }

  const handleFinalConfirm = async () => {
    setIsProcessing(true)
    try {
      // Validate secure session for critical operations
      if (requiresSecureSession && secureSession) {
        const isValid = await reportSecurity.validateSecureSession(secureSession)
        if (!isValid) {
          throw new Error("Secure session expired. Please try again.")
        }
      }

      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error("Deletion failed:", error)
      // Error handling would be done by the parent component
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${getRiskColor(riskLevel)}`}>
              {getRiskIcon(riskLevel)}
              <div>
                <Badge variant="outline" className={getRiskColor(riskLevel)}>
                  {riskLevel.toUpperCase()} RISK
                </Badge>
                <p className="font-medium mt-1">{description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Item to be deleted:</p>
              <p className="text-lg font-medium text-destructive">{itemName}</p>

              {Object.entries(itemDetails).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>

            {riskLevel === "critical" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Critical Business Data Warning
                </div>
                <p className="text-red-700 text-sm">
                  This action will permanently remove valuable business data that may be required for: compliance
                  audits, legal proceedings, historical analysis, and business continuity.
                </p>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Type Confirmation Required</h3>
              <p className="text-muted-foreground">
                To proceed with this {riskLevel} risk deletion, type <strong>DELETE</strong> below:
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmText">Type "DELETE" to confirm:</Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="text-center font-mono"
                autoComplete="off"
              />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {confirmText.toUpperCase() === "DELETE" ? (
                <span className="text-green-600 font-medium">✓ Confirmation text correct</span>
              ) : (
                <span>Please type exactly: DELETE</span>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Final Risk Acknowledgment</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="acknowledgeRisk"
                  checked={acknowledgeRisk}
                  onCheckedChange={(checked) => setAcknowledgeRisk(checked as boolean)}
                />
                <Label htmlFor="acknowledgeRisk" className="text-sm leading-relaxed">
                  I understand that this action is <strong>irreversible</strong> and will permanently remove this
                  business data from the system. I acknowledge full responsibility for this decision and confirm that I
                  have the authority to perform this action.
                </Label>
              </div>

              {requiresSecureSession && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  Secure session validated for critical operation
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Clock className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Security Countdown</h3>
              <p className="text-muted-foreground">
                Please wait for the security countdown to complete before proceeding.
              </p>
            </div>

            <div className="text-center">
              <div className="text-6xl font-bold text-red-500 mb-2">{countdown}</div>
              <p className="text-sm text-muted-foreground">
                {countdown > 0 ? "seconds remaining" : "You may now proceed"}
              </p>
            </div>

            {countdown === 0 && (
              <div className="text-center text-green-600 font-medium">✓ Security countdown complete</div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getRiskIcon(riskLevel)}
            {title}
            <Badge variant="outline" className={getRiskColor(riskLevel)}>
              Step {currentStep} of {getMaxSteps()}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{renderStepContent()}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleNextStep}
            disabled={!canProceedToNextStep() || isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? "Processing..." : currentStep < getMaxSteps() ? "Continue" : "Delete Forever"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

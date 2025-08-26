"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, User, FileText, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { useState, useEffect } from "react"

interface ReportViewClientProps {
  submission: any
  responses: any[]
  autoDownload?: boolean
}

export function ReportViewClient({ submission, responses, autoDownload = false }: ReportViewClientProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [organizationName, setOrganizationName] = useState<string>("")
  const [organizationLogo, setOrganizationLogo] = useState<string>("")

  useEffect(() => {
    const loadOrganizationBranding = async () => {
      try {
        const response = await fetch("/api/organization/branding")
        if (response.ok) {
          const data = await response.json()
          setOrganizationName(data.name || "Your Organization")
          setOrganizationLogo(data.logo_url || "")
        }
      } catch (error) {
        console.log("[v0] Could not load organization branding, using defaults")
        setOrganizationName("Your Organization")
      }
    }

    loadOrganizationBranding()

    if (autoDownload) {
      setTimeout(() => {
        downloadPDF()
      }, 1000)
    }
  }, [autoDownload])

  const convertOklchToHex = (element: HTMLElement) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null)
    const elements: HTMLElement[] = []
    let node = walker.nextNode()
    while (node) {
      elements.push(node as HTMLElement)
      node = walker.nextNode()
    }

    const oklchFallbacks: { [key: string]: string } = {
      "oklch(0.98 0.013 106.89)": "#fefefe", // white
      "oklch(0.15 0.02 286.62)": "#1f2937", // gray-800
      "oklch(0.25 0.02 286.62)": "#374151", // gray-700
      "oklch(0.35 0.02 286.62)": "#4b5563", // gray-600
      "oklch(0.45 0.02 286.62)": "#6b7280", // gray-500
      "oklch(0.55 0.015 286.62)": "#9ca3af", // gray-400
      "oklch(0.65 0.015 286.62)": "#d1d5db", // gray-300
      "oklch(0.75 0.01 286.62)": "#e5e7eb", // gray-200
      "oklch(0.85 0.005 286.62)": "#f3f4f6", // gray-100
      "oklch(0.95 0.003 286.62)": "#f9fafb", // gray-50
      "oklch(0.5 0.233 262.29)": "#3b82f6", // blue-500
      "oklch(0.45 0.243 262.29)": "#2563eb", // blue-600
      "oklch(0.6 0.18 158.66)": "#10b981", // green-500
      "oklch(0.55 0.19 158.66)": "#059669", // green-600
      "oklch(0.65 0.25 29.23)": "#f59e0b", // yellow-500
      "oklch(0.6 0.26 29.23)": "#d97706", // yellow-600
      "oklch(0.63 0.24 27.33)": "#ef4444", // red-500
      "oklch(0.58 0.25 27.33)": "#dc2626", // red-600
    }

    elements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el)

      const convertColor = (colorValue: string): string => {
        if (!colorValue || !colorValue.includes("oklch")) return colorValue

        if (oklchFallbacks[colorValue]) {
          return oklchFallbacks[colorValue]
        }

        try {
          const tempDiv = document.createElement("div")
          tempDiv.style.color = colorValue
          document.body.appendChild(tempDiv)
          const computedColor = window.getComputedStyle(tempDiv).color
          document.body.removeChild(tempDiv)

          if (computedColor && computedColor.startsWith("rgb")) {
            return computedColor
          }
        } catch (e) {
          console.warn("[v0] Could not convert color:", colorValue)
        }

        return colorValue.includes("0.9")
          ? "#f9fafb"
          : colorValue.includes("0.8")
            ? "#f3f4f6"
            : colorValue.includes("0.1")
              ? "#1f2937"
              : "#6b7280"
      }

      if (computedStyle.backgroundColor) {
        const convertedBg = convertColor(computedStyle.backgroundColor)
        if (convertedBg !== computedStyle.backgroundColor) {
          el.style.backgroundColor = convertedBg
        }
      }

      if (computedStyle.color) {
        const convertedColor = convertColor(computedStyle.color)
        if (convertedColor !== computedStyle.color) {
          el.style.color = convertedColor
        }
      }

      if (computedStyle.borderColor) {
        const convertedBorder = convertColor(computedStyle.borderColor)
        if (convertedBorder !== computedStyle.borderColor) {
          el.style.borderColor = convertedBorder
        }
      }
    })
  }

  const downloadPDF = async () => {
    setIsGenerating(true)

    try {
      console.log("[v0] Starting PDF generation...")
      const element = document.getElementById("report-content")
      if (!element) {
        console.error("[v0] Report content element not found")
        return
      }

      const clonedElement = element.cloneNode(true) as HTMLElement
      document.body.appendChild(clonedElement)
      clonedElement.style.position = "absolute"
      clonedElement.style.left = "-9999px"
      clonedElement.style.top = "0"
      clonedElement.style.width = element.offsetWidth + "px"

      console.log("[v0] Converting oklch colors...")
      convertOklchToHex(clonedElement)

      console.log("[v0] Generating canvas from HTML...")
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        removeContainer: true,
      })

      document.body.removeChild(clonedElement)

      console.log("[v0] Creating PDF...")
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")

      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `report-${submission.checklist_templates?.name?.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`
      console.log("[v0] Saving PDF as:", fileName)
      pdf.save(fileName)
      console.log("[v0] PDF generation completed successfully")
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden bg-gray-50 border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard-analytics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Link>
          </Button>
          <div className="flex gap-3">
            <Button variant="default" onClick={downloadPDF} disabled={isGenerating} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {isGenerating ? "Generating PDF..." : "Download"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-8 max-w-4xl">
        <div id="report-content" className="bg-white shadow-lg print:shadow-none print:max-w-none print:p-0">
          <div className="p-8 print:p-6">
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-center gap-4 mb-4">
                {organizationLogo ? (
                  <img
                    src={organizationLogo || "/placeholder.svg"}
                    alt="Company Logo"
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {organizationName.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-gray-900">{organizationName}</h1>
                  <p className="text-sm text-gray-600">Professional Compliance Report</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {submission.checklist_templates?.name || "Report"}
              </h2>
              <p className="text-gray-600 text-base">
                {submission.checklist_templates?.description || "Detailed Report"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 print:bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Submitted by</p>
                  <p className="font-medium text-sm">{submission.profiles?.full_name || submission.profiles?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Completion Date</p>
                  <p className="font-medium text-sm">{new Date(submission.completed_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <Badge variant={submission.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {submission.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Report Details</h2>

              {submission.checklist_templates?.checklist_items?.map((item: any, index: number) => {
                const response = responses.find((r) => r.item_id === item.id)

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 print:bg-gray-100 rounded border-l-2 border-blue-500"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {index + 1}. {item.name}
                        </span>
                        <Badge variant={response?.is_completed ? "default" : "secondary"} className="text-xs">
                          {response?.is_completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        {item.task_type === "boolean" && <span>Response: {response?.is_completed ? "Yes" : "No"}</span>}
                        {item.task_type === "text" && response?.notes && <span>Response: {response.notes}</span>}
                        {item.task_type === "number" && response?.notes && <span>Value: {response.notes}</span>}
                        {item.task_type === "options" && response?.notes && <span>Selected: {response.notes}</span>}
                        {response?.completed_at && (
                          <span className="ml-3">Completed: {new Date(response.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 pt-4 border-t">
              <div className="text-center text-gray-600">
                <p className="text-xs">
                  Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
                <p className="text-xs mt-1">This is an official report from {organizationName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}

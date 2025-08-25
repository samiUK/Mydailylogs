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

  useEffect(() => {
    if (autoDownload) {
      setTimeout(() => {
        downloadPDF()
      }, 1000)
    }
  }, [autoDownload])

  const convertOklchToHex = (element: HTMLElement) => {
    console.log("[v0] Converting oklch colors to hex...")

    // Common Tailwind oklch colors mapped to hex equivalents
    const oklchToHexMap: { [key: string]: string } = {
      "oklch(0.98 0.013 106.89)": "#fefefe", // white
      "oklch(0.23 0.084 264.52)": "#1e293b", // slate-800
      "oklch(0.278 0.029 256.85)": "#334155", // slate-700
      "oklch(0.533 0.015 252.83)": "#64748b", // slate-500
      "oklch(0.651 0.015 256.85)": "#94a3b8", // slate-400
      "oklch(0.961 0.013 106.89)": "#f1f5f9", // slate-50
      "oklch(0.976 0.006 106.89)": "#f8fafc", // slate-50
      "oklch(0.570 0.191 231.6)": "#3b82f6", // blue-500
      "oklch(0.628 0.258 142.5)": "#10b981", // green-500
      "oklch(0.576 0.196 38.18)": "#f59e0b", // yellow-500
      "oklch(0.628 0.258 29.23)": "#ef4444", // red-500
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null)
    const elements: HTMLElement[] = []
    let node = walker.nextNode()
    while (node) {
      elements.push(node as HTMLElement)
      node = walker.nextNode()
    }

    elements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el)

      // Convert background color
      if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes("oklch")) {
        const oklchColor = computedStyle.backgroundColor
        if (oklchToHexMap[oklchColor]) {
          el.style.backgroundColor = oklchToHexMap[oklchColor]
        } else {
          // Fallback: try to resolve through temporary element
          try {
            const tempDiv = document.createElement("div")
            tempDiv.style.color = oklchColor
            document.body.appendChild(tempDiv)
            const resolvedColor = window.getComputedStyle(tempDiv).color
            document.body.removeChild(tempDiv)
            if (resolvedColor && !resolvedColor.includes("oklch")) {
              el.style.backgroundColor = resolvedColor
            } else {
              el.style.backgroundColor = "#ffffff" // Safe fallback
            }
          } catch (error) {
            console.warn("[v0] Could not convert oklch background color, using fallback")
            el.style.backgroundColor = "#ffffff"
          }
        }
      }

      // Convert text color
      if (computedStyle.color && computedStyle.color.includes("oklch")) {
        const oklchColor = computedStyle.color
        if (oklchToHexMap[oklchColor]) {
          el.style.color = oklchToHexMap[oklchColor]
        } else {
          try {
            const tempDiv = document.createElement("div")
            tempDiv.style.color = oklchColor
            document.body.appendChild(tempDiv)
            const resolvedColor = window.getComputedStyle(tempDiv).color
            document.body.removeChild(tempDiv)
            if (resolvedColor && !resolvedColor.includes("oklch")) {
              el.style.color = resolvedColor
            } else {
              el.style.color = "#000000" // Safe fallback
            }
          } catch (error) {
            console.warn("[v0] Could not convert oklch text color, using fallback")
            el.style.color = "#000000"
          }
        }
      }

      // Convert border color
      if (computedStyle.borderColor && computedStyle.borderColor.includes("oklch")) {
        const oklchColor = computedStyle.borderColor
        if (oklchToHexMap[oklchColor]) {
          el.style.borderColor = oklchToHexMap[oklchColor]
        } else {
          try {
            const tempDiv = document.createElement("div")
            tempDiv.style.borderColor = oklchColor
            document.body.appendChild(tempDiv)
            const resolvedColor = window.getComputedStyle(tempDiv).borderColor
            document.body.removeChild(tempDiv)
            if (resolvedColor && !resolvedColor.includes("oklch")) {
              el.style.borderColor = resolvedColor
            } else {
              el.style.borderColor = "#e5e7eb" // Safe fallback
            }
          } catch (error) {
            console.warn("[v0] Could not convert oklch border color, using fallback")
            el.style.borderColor = "#e5e7eb"
          }
        }
      }
    })

    console.log("[v0] Oklch color conversion completed")
  }

  const downloadPDF = async () => {
    setIsGenerating(true)

    try {
      console.log("[v0] Starting PDF generation...")
      const element = document.getElementById("report-content")
      if (!element) {
        console.error("[v0] Report content element not found")
        alert("Error: Report content not found. Please refresh and try again.")
        return
      }

      console.log("[v0] Cloning element for PDF generation...")
      const clonedElement = element.cloneNode(true) as HTMLElement
      document.body.appendChild(clonedElement)
      clonedElement.style.position = "absolute"
      clonedElement.style.left = "-9999px"
      clonedElement.style.width = element.offsetWidth + "px"

      convertOklchToHex(clonedElement)

      console.log("[v0] Generating canvas from HTML...")
      const canvas = await html2canvas(clonedElement, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        onclone: (clonedDoc) => {
          console.log("[v0] html2canvas cloning completed")
        },
      })

      document.body.removeChild(clonedElement)
      console.log("[v0] Canvas generation completed, size:", canvas.width, "x", canvas.height)

      console.log("[v0] Creating PDF document...")
      const imgData = canvas.toDataURL("image/jpeg", 0.7)
      const pdf = new jsPDF("p", "mm", "a4")

      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `staff-report-${submission.checklist_templates?.name?.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`
      console.log("[v0] Saving PDF as:", fileName)
      pdf.save(fileName)
      console.log("[v0] PDF generation completed successfully")
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error generating PDF: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden bg-gray-50 border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/staff/history">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {submission.checklist_templates?.name || "Report"}
              </h1>
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
                <p className="text-xs mt-1">This is an official report from the MyDayLogs system</p>
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

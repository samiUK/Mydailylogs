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
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null)

    const elements: HTMLElement[] = []
    let node = walker.nextNode()
    while (node) {
      elements.push(node as HTMLElement)
      node = walker.nextNode()
    }

    elements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el)

      if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes("oklch")) {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = computedStyle.backgroundColor
          const hexColor = ctx.fillStyle
          el.style.backgroundColor = hexColor
        }
      }

      if (computedStyle.color && computedStyle.color.includes("oklch")) {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = computedStyle.color
          const hexColor = ctx.fillStyle
          el.style.color = hexColor
        }
      }

      if (computedStyle.borderColor && computedStyle.borderColor.includes("oklch")) {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = computedStyle.borderColor
          const hexColor = ctx.fillStyle
          el.style.borderColor = hexColor
        }
      }
    })
  }

  const downloadPDF = async () => {
    setIsGenerating(true)

    try {
      const element = document.getElementById("report-content")
      if (!element) return

      const clonedElement = element.cloneNode(true) as HTMLElement
      document.body.appendChild(clonedElement)
      clonedElement.style.position = "absolute"
      clonedElement.style.left = "-9999px"

      convertOklchToHex(clonedElement)

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      document.body.removeChild(clonedElement)

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
      pdf.save(fileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
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

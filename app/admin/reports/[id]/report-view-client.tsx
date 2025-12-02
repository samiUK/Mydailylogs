"use client"

import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { AuditPDFGenerator } from "@/lib/pdf-generator"
import { formatDateUK } from "@/lib/date-formatter"
import { createClient } from "@/lib/supabase/client"

interface ReportViewClientProps {
  submission: any
  responses: any[]
  autoDownload?: boolean
}

export function ReportViewClient({ submission, responses, autoDownload = false }: ReportViewClientProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [organizationData, setOrganizationData] = useState<any>(null)

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("organization_id", submission.organization_id)
          .single()

        if (!error && data) {
          setOrganizationData(data)
        }
      } catch (error) {
        console.error("Could not load organization data")
      }
    }

    loadOrganizationData()

    if (autoDownload) {
      setTimeout(() => {
        downloadPDF()
      }, 1000)
    }
  }, [autoDownload, submission.organization_id])

  const downloadPDF = async () => {
    setIsGenerating(true)

    try {
      await AuditPDFGenerator.generatePDF({
        elementId: "report-content",
        fileName: `${organizationData?.organization_name?.replace(/[^a-zA-Z0-9]/g, "-") || "report"}-${submission.checklist_templates?.name?.replace(/[^a-zA-Z0-9]/g, "-")}-${formatDateUK(new Date(), "short").replace(/\//g, "-")}.pdf`,
        metadata: {
          title: `${submission.checklist_templates?.name || "Compliance Report"} - ${organizationData?.organization_name || "Organization"}`,
          author: submission.profiles?.full_name || submission.profiles?.email || "Unknown",
          subject: "Compliance Audit Report - Industry Standard Format",
          keywords: "compliance, audit, report, checklist, " + (submission.checklist_templates?.name || ""),
          creator: "MyDayLogs Compliance Platform",
        },
        onProgress: (stage) => {},
        onError: (error) => {
          console.error("PDF generation error:", error)
          alert("Error generating PDF. Please try again.")
        },
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const companyName = organizationData?.organization_name || "Your Organization"
  const companyLogo = organizationData?.logo_url || null
  const companyAddress = organizationData?.address || "123 Business Street, London, UK, SW1A 1AA"
  const submitterName = submission.profiles?.full_name || submission.profiles?.email || "Unknown"
  const submitterEmail = submission.profiles?.email || ""
  const submissionDate = submission.completed_at ? new Date(submission.completed_at) : new Date()
  const reportPeriod = submission.checklist_templates?.schedule_type || "Daily"

  return (
    <div className="min-h-screen bg-white">
      <div className={`bg-gray-50 border-b p-4 ${isGenerating ? "hidden" : "print:hidden"}`}>
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <div className="flex gap-3">
            <Button variant="default" onClick={downloadPDF} disabled={isGenerating} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {isGenerating ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-8 max-w-4xl">
        <div id="report-content" className="bg-white shadow-lg print:shadow-none print:max-w-none print:p-0">
          <div className="p-10 print:p-8">
            <div className="mb-8 pb-6 border-b-4 border-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {companyLogo ? (
                    <img
                      src={companyLogo || "/placeholder.svg"}
                      alt="Company Logo"
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-2xl">
                      {companyName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{companyName}</h1>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{companyAddress}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Report Date</p>
                  <p className="text-base font-bold text-gray-900">{formatDateUK(new Date(), "short")}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date().toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-100 px-4 py-3 rounded-lg border-l-4 border-blue-600">
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {submission.checklist_templates?.name || "Compliance Report"}
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Report Type:</span>
                    <span className="text-gray-900">{reportPeriod} Compliance Check</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Report ID:</span>
                    <span className="text-gray-900 font-mono text-xs">{submission.id?.slice(0, 12).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Submitted By:</span>
                    <span className="text-gray-900">{submitterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Submission Date:</span>
                    <span className="text-gray-900">{formatDateUK(submissionDate, "short")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="text-green-700 font-semibold">✓ Completed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Total Tasks:</span>
                    <span className="text-gray-900">
                      {submission.checklist_templates?.checklist_items?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Task Completion Details</h3>
              <table className="w-full border-collapse border-2 border-gray-400 text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 px-3 py-3 text-left font-bold text-gray-800 w-12">#</th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-bold text-gray-800">
                      Task Description
                    </th>
                    <th className="border border-gray-400 px-3 py-3 text-center font-bold text-gray-800 w-20">
                      Status
                    </th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-bold text-gray-800 w-40">
                      Response
                    </th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-bold text-gray-800 w-32">
                      Completed At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submission.checklist_templates?.checklist_items?.map((item: any, index: number) => {
                    const response = responses.find((r) => r.item_id === item.id)
                    const isCompleted = response?.is_completed

                    return (
                      <>
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-400 px-3 py-3 text-center text-gray-800 font-semibold">
                            {index + 1}
                          </td>
                          <td className="border border-gray-400 px-3 py-3 text-gray-900">{item.name}</td>
                          <td className="border border-gray-400 px-3 py-3 text-center">
                            {isCompleted ? (
                              <span className="text-2xl text-green-600 font-bold">✓</span>
                            ) : (
                              <span className="text-2xl text-red-600 font-bold">✗</span>
                            )}
                          </td>
                          <td className="border border-gray-400 px-3 py-3 text-gray-800">
                            {item.task_type === "boolean" && <span>{isCompleted ? "Yes" : "No"}</span>}
                            {item.task_type === "text" && response?.notes && (
                              <span className="text-xs">{response.notes}</span>
                            )}
                            {item.task_type === "number" && response?.notes && <span>{response.notes}</span>}
                            {item.task_type === "options" && response?.notes && <span>{response.notes}</span>}
                            {item.task_type === "photo" && (
                              <span className="text-xs text-blue-600 font-medium">See photo below</span>
                            )}
                            {!response?.notes && item.task_type !== "boolean" && item.task_type !== "photo" && (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="border border-gray-400 px-3 py-3 text-gray-800 text-xs">
                            {response?.completed_at ? (
                              <>
                                <div className="font-medium">
                                  {formatDateUK(new Date(response.completed_at), "short")}
                                </div>
                                <div className="text-gray-600">
                                  {new Date(response.completed_at).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                        {item.task_type === "photo" && response?.response_value && (
                          <tr key={`${item.id}-photo`}>
                            <td className="border border-gray-400 px-3 py-2 bg-gray-50" colSpan={5}>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-700 uppercase">Photo Evidence:</span>
                                {(() => {
                                  try {
                                    const photos = JSON.parse(response.response_value)
                                    return photos
                                      .slice(0, 1)
                                      .map((photo: { name: string; dataUrl: string }, idx: number) => (
                                        <div key={idx} className="border border-gray-300 rounded p-2 bg-white">
                                          <img
                                            src={photo.dataUrl || "/placeholder.svg"}
                                            alt={`${item.name} - Photo evidence`}
                                            className="h-32 w-auto object-contain rounded"
                                          />
                                        </div>
                                      ))
                                  } catch {
                                    return <span className="text-xs text-red-500">Invalid photo data</span>
                                  }
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-4">SUBMITTED BY:</p>
                  <div className="border-b-2 border-gray-400 pb-1 mb-2 h-16 flex items-end">
                    <span className="text-base font-semibold text-gray-900">{submitterName}</span>
                  </div>
                  <p className="text-xs text-gray-600">Name & Signature</p>
                  <p className="text-xs text-gray-500 mt-1">{submitterEmail}</p>
                  <p className="text-xs text-gray-500">Date: {formatDateUK(submissionDate, "short")}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-4">REVIEWED BY:</p>
                  <div className="border-b-2 border-gray-400 pb-1 mb-2 h-16"></div>
                  <p className="text-xs text-gray-600">Name & Signature</p>
                  <p className="text-xs text-gray-500 mt-1">Date: ____________________</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300">
              <div className="flex justify-between items-start text-xs text-gray-600">
                <div className="space-y-1">
                  <p className="font-bold text-gray-800">Document Information</p>
                  <p>This is an official audit-ready compliance report</p>
                  <p>Report ID: {submission.id?.slice(0, 12).toUpperCase()}</p>
                  <p>
                    Generated: {formatDateUK(new Date(), "long")} at {new Date().toLocaleTimeString("en-GB")}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-bold text-gray-800">{companyName}</p>
                  <p>Compliance Management System</p>
                  <p>Page 1 of 1</p>
                  <p className="text-gray-500 mt-2">Powered by MyDayLogs</p>
                </div>
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
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  )
}

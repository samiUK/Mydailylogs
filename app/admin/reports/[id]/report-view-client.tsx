"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, User, FileText, Download, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ReportViewClientProps {
  submission: any
  responses: any[]
}

export function ReportViewClient({ submission, responses }: ReportViewClientProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Print/Screen Navigation - Hidden in print */}
      <div className="print:hidden bg-gray-50 border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/analytics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.print()
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="bg-white shadow-lg print:shadow-none print:max-w-none print:p-0">
          {/* Report Header */}
          <div className="p-8 print:p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {submission.checklist_templates?.name || "Report"}
              </h1>
              <p className="text-gray-600 text-lg">
                {submission.checklist_templates?.description || "Detailed Report"}
              </p>
            </div>

            {/* Report Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 print:bg-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Submitted by</p>
                  <p className="font-semibold">{submission.profiles?.full_name || submission.profiles?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Completion Date</p>
                  <p className="font-semibold">{new Date(submission.completed_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
                    {submission.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Report Content */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Report Details</h2>

              {submission.checklist_templates?.checklist_items?.map((item: any, index: number) => {
                const response = responses.find((r) => r.item_id === item.id)

                return (
                  <div key={item.id} className="border-l-4 border-blue-500 pl-6 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {index + 1}. {item.name}
                      </h3>
                      <Badge variant={response?.is_completed ? "default" : "secondary"} className="ml-4">
                        {response?.is_completed ? "Completed" : "Pending"}
                      </Badge>
                    </div>

                    {/* Response Content */}
                    <div className="bg-gray-50 print:bg-gray-100 rounded-lg p-4 mt-3">
                      {item.task_type === "boolean" && (
                        <p className="text-gray-700">
                          <span className="font-medium">Response:</span> {response?.is_completed ? "Yes" : "No"}
                        </p>
                      )}

                      {item.task_type === "text" && response?.notes && (
                        <p className="text-gray-700">
                          <span className="font-medium">Response:</span> {response.notes}
                        </p>
                      )}

                      {item.task_type === "number" && response?.notes && (
                        <p className="text-gray-700">
                          <span className="font-medium">Value:</span> {response.notes}
                        </p>
                      )}

                      {item.task_type === "photo" && response?.photo_url && (
                        <div>
                          <p className="font-medium text-gray-700 mb-2">Photo Evidence:</p>
                          <img
                            src={response.photo_url || "/placeholder.svg"}
                            alt="Task evidence"
                            className="max-w-md max-h-64 rounded-lg border shadow-sm"
                          />
                        </div>
                      )}

                      {item.task_type === "options" && response?.notes && (
                        <p className="text-gray-700">
                          <span className="font-medium">Selected Option:</span> {response.notes}
                        </p>
                      )}

                      {response?.completed_at && (
                        <p className="text-sm text-gray-500 mt-3 border-t pt-2">
                          Completed: {new Date(response.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Report Footer */}
            <div className="mt-12 pt-8 border-t">
              <div className="text-center text-gray-600">
                <p className="text-sm">
                  Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
                <p className="text-xs mt-2">This is an official report from the Daily Brand Check system</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
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

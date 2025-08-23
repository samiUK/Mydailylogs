"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface PDFDownloadButtonProps {
  assignment: any
  responses: any[]
}

export function PDFDownloadButton({ assignment, responses }: PDFDownloadButtonProps) {
  const generatePDF = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report - ${assignment.checklist_templates?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; margin: -20px -20px 30px -20px; text-align: center; }
            .logo { width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #10b981; }
            .title { font-size: 24px; font-weight: bold; margin: 0 0 5px 0; }
            .subtitle { font-size: 14px; opacity: 0.9; margin: 0; }
            .report-info { background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .task { margin-bottom: 20px; padding: 15px; border: 1px solid #e1e5e9; border-radius: 8px; background: white; }
            .task-title { font-weight: bold; margin-bottom: 8px; color: #333; }
            .response { margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
            .photo { max-width: 300px; max-height: 200px; margin: 10px 0; border-radius: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">✓</div>
            <h1 class="title">Mydailylogs</h1>
            <p class="subtitle">Daily Compliance and Reporting made simple</p>
          </div>
          
          <div class="report-info">
            <h2>${assignment.checklist_templates?.name}</h2>
            <p><strong>Completed:</strong> ${new Date(assignment.completed_at).toLocaleString()}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <h3>Task Responses</h3>
          ${assignment.checklist_templates?.checklist_items
            ?.map((task: any) => {
              const taskResponse = responses.find((r) => r.item_id === task.id)
              return `
              <div class="task">
                <div class="task-title">${task.name}</div>
                <div class="response">
                  ${taskResponse?.notes ? `<p><strong>Response:</strong> ${taskResponse.notes}</p>` : ""}
                  ${taskResponse?.photo_url ? `<img src="${taskResponse.photo_url}" alt="Task photo" class="photo" />` : ""}
                  <p><small>Completed: ${taskResponse?.completed_at ? new Date(taskResponse.completed_at).toLocaleString() : "N/A"}</small></p>
                </div>
              </div>
            `
            })
            .join("")}
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <Button variant="outline" size="sm" onClick={generatePDF}>
      <Download className="w-4 h-4 mr-1" />
      Download PDF
    </Button>
  )
}

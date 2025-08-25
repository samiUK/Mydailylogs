"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { useState } from "react"

interface PDFDownloadButtonProps {
  assignment: any
  responses: any[]
}

export function PDFDownloadButton({ assignment, responses }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)

    try {
      const tempDiv = document.createElement("div")
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      tempDiv.style.width = "210mm" // A4 width
      tempDiv.style.padding = "20px"
      tempDiv.style.fontFamily = "Arial, sans-serif"
      tempDiv.style.lineHeight = "1.6"
      tempDiv.style.backgroundColor = "white"

      const html = `
        <div style="text-align: center; margin-bottom: 30px; padding: 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 8px;">
          <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #10b981;">✓</div>
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 5px 0;">Mydailylogs</h1>
          <p style="font-size: 14px; opacity: 0.9; margin: 0;">Daily Compliance and Reporting made simple</p>
        </div>
        
        <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0;">${assignment.checklist_templates?.name}</h2>
          <p><strong>Completed:</strong> ${new Date(assignment.completed_at).toLocaleString()}</p>
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Task Responses</h3>
        ${assignment.checklist_templates?.checklist_items
          ?.map((task: any) => {
            const taskResponse = responses.find((r) => r.item_id === task.id)
            return `
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e1e5e9; border-radius: 8px; background: white;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #333;">${task.name}</div>
              <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                ${taskResponse?.notes ? `<p><strong>Response:</strong> ${taskResponse.notes}</p>` : ""}
                ${taskResponse?.photo_url ? `<img src="${taskResponse.photo_url}" alt="Task photo" style="max-width: 300px; max-height: 200px; margin: 10px 0; border-radius: 8px;" />` : ""}
                <p style="font-size: 12px; color: #666;">Completed: ${taskResponse?.completed_at ? new Date(taskResponse.completed_at).toLocaleString() : "N/A"}</p>
              </div>
            </div>
          `
          })
          .join("")}
      `

      tempDiv.innerHTML = html
      document.body.appendChild(tempDiv)

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      document.body.removeChild(tempDiv)

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
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

      pdf.save(`report-${assignment.checklist_templates?.name}-${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button variant="default" size="sm" onClick={generatePDF} disabled={isGenerating}>
      <Download className="w-4 h-4 mr-1" />
      {isGenerating ? "Generating..." : "Download"}
    </Button>
  )
}

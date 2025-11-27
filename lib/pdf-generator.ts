import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface PDFMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
}

interface PDFGenerationOptions {
  elementId: string
  fileName: string
  metadata: PDFMetadata
  onProgress?: (stage: string) => void
  onError?: (error: Error) => void
}

/**
 * Optimized PDF generation utility for audit-ready compliance reports
 * Target file size: 200-300KB
 * Format: Industry-standard A4 PDF with metadata
 */
export class AuditPDFGenerator {
  private static readonly CANVAS_SCALE = 0.9 // Reduced from 2.0 for smaller file size
  private static readonly JPEG_QUALITY = 0.65 // Optimized quality/size ratio
  private static readonly A4_WIDTH = 210 // mm
  private static readonly A4_HEIGHT = 297 // mm

  /**
   * Convert oklch colors to hex for PDF compatibility
   */
  private static convertOklchToHex(element: HTMLElement): void {
    const oklchToHexMap: Record<string, string> = {
      "oklch(0.98 0.013 106.89)": "#fefefe",
      "oklch(0.23 0.084 264.52)": "#1e293b",
      "oklch(0.278 0.029 256.85)": "#334155",
      "oklch(0.533 0.015 252.83)": "#64748b",
      "oklch(0.651 0.015 256.85)": "#94a3b8",
      "oklch(0.961 0.013 106.89)": "#f1f5f9",
      "oklch(0.976 0.006 106.89)": "#f8fafc",
      "oklch(0.570 0.191 231.6)": "#3b82f6",
      "oklch(0.628 0.258 142.5)": "#10b981",
      "oklch(0.576 0.196 38.18)": "#f59e0b",
      "oklch(0.628 0.258 29.23)": "#ef4444",
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT)
    const elements: HTMLElement[] = [element]
    let node = walker.nextNode()
    while (node) {
      elements.push(node as HTMLElement)
      node = walker.nextNode()
    }

    elements.forEach((el) => {
      const style = window.getComputedStyle(el)

      // Convert background, text, and border colors
      const convertColor = (color: string, fallback: string): string => {
        if (color?.includes("oklch")) {
          return oklchToHexMap[color] || fallback
        }
        return color
      }

      if (style.backgroundColor) {
        el.style.backgroundColor = convertColor(style.backgroundColor, "#ffffff")
      }
      if (style.color) {
        el.style.color = convertColor(style.color, "#000000")
      }
      if (style.borderColor) {
        el.style.borderColor = convertColor(style.borderColor, "#e5e7eb")
      }
    })
  }

  /**
   * Generate audit-ready PDF with optimized file size
   */
  static async generatePDF(options: PDFGenerationOptions): Promise<void> {
    const { elementId, fileName, metadata, onProgress, onError } = options

    try {
      onProgress?.("Preparing document...")

      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Element with ID "${elementId}" not found`)
      }

      // Clone element for processing
      const clonedElement = element.cloneNode(true) as HTMLElement
      document.body.appendChild(clonedElement)
      clonedElement.style.position = "absolute"
      clonedElement.style.left = "-9999px"
      clonedElement.style.top = "0"
      clonedElement.style.width = `${element.offsetWidth}px`
      clonedElement.style.backgroundColor = "#ffffff"

      onProgress?.("Converting colors...")
      this.convertOklchToHex(clonedElement)

      onProgress?.("Generating image...")
      const canvas = await html2canvas(clonedElement, {
        scale: this.CANVAS_SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        removeContainer: false,
        imageTimeout: 0,
      })

      document.body.removeChild(clonedElement)

      onProgress?.("Creating PDF...")

      // Convert to JPEG with compression for smaller file size
      const imgData = canvas.toDataURL("image/jpeg", this.JPEG_QUALITY)

      // Create PDF with metadata
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      })

      // Add audit-ready metadata
      pdf.setProperties({
        title: metadata.title,
        subject: metadata.subject,
        author: metadata.author,
        keywords: metadata.keywords,
        creator: metadata.creator,
      })

      // Calculate dimensions
      const imgWidth = this.A4_WIDTH
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST")
      heightLeft -= this.A4_HEIGHT

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST")
        heightLeft -= this.A4_HEIGHT
      }

      onProgress?.("Saving PDF...")
      pdf.save(fileName)

      onProgress?.("Complete")
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown PDF generation error")
      onError?.(err)
      throw err
    }
  }
}

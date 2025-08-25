"use client"

console.log("[v0] Staff History page - File loaded and parsing")

export default function StaffHistoryPage() {
  console.log("[v0] Staff History page - Component function called")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Report History</h1>
        <p className="text-muted-foreground mt-2">Minimal test version - checking if component loads</p>
      </div>

      <div className="p-4 border rounded-lg">
        <p>If you can see this message, the staff history page is now loading properly.</p>
        <p>Debug logs should show "File loaded and parsing" and "Component function called".</p>
      </div>
    </div>
  )
}

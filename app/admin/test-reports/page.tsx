console.log("[v0] TEST REPORTS PAGE - File loaded and parsing")

export default function TestReportsPage() {
  console.log("[v0] TEST REPORTS PAGE - Component function called")

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">TEST REPORTS PAGE</h1>
      <p>This is a test to see if the reports functionality works at a different route.</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>
          If you can see this, the component is working and the issue is with the /admin/reports route specifically.
        </p>
      </div>
    </div>
  )
}

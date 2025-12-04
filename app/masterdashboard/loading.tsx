export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-red-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading Master Dashboard...</p>
      </div>
    </div>
  )
}

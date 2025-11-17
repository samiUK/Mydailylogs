"use client"

export function DashboardFooter() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="mt-auto bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {currentYear} All rights reserved by Mydaylogs.co.uk
        </p>
      </div>
    </footer>
  )
}

export default async function DiagnosticsPage() {
  const hasResendKey = !!process.env.RESEND_API_KEY
  const hasSMTPHost = !!process.env.SMTP_HOST
  const hasSiteUrl = !!process.env.NEXT_PUBLIC_SITE_URL

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Email System Diagnostics</h1>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${hasResendKey ? "bg-green-500" : "bg-red-500"}`} />
              <span className="font-medium">RESEND_API_KEY:</span>
              <span className={hasResendKey ? "text-green-600" : "text-red-600"}>
                {hasResendKey ? "Configured ✓" : "Missing ✗"}
              </span>
              {hasResendKey && (
                <span className="text-gray-500 text-sm">({process.env.RESEND_API_KEY?.substring(0, 10)}...)</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${hasSMTPHost ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="font-medium">SMTP_HOST:</span>
              <span className={hasSMTPHost ? "text-green-600" : "text-yellow-600"}>
                {hasSMTPHost ? "Configured ✓" : "Not configured (optional)"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${hasSiteUrl ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="font-medium">NEXT_PUBLIC_SITE_URL:</span>
              <span className={hasSiteUrl ? "text-green-600" : "text-yellow-600"}>
                {hasSiteUrl ? process.env.NEXT_PUBLIC_SITE_URL : "Using fallback URL"}
              </span>
            </div>
          </div>
        </div>

        {!hasResendKey && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">Action Required!</h3>
            <p className="text-red-700 mb-4">
              RESEND_API_KEY is not configured. Email verification will not work without it.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-red-700">
              <li>Go to https://resend.com and get your API key</li>
              <li>Add it to your Vercel environment variables as RESEND_API_KEY</li>
              <li>Redeploy your application</li>
            </ol>
          </div>
        )}

        {hasResendKey && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-green-800 font-semibold mb-2">Email System Ready ✓</h3>
            <p className="text-green-700">
              All required email configuration is in place. Verification emails should be sent on signup.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-blue-800 font-semibold mb-2">Testing Tips</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
            <li>Check your Resend dashboard at https://resend.com/emails to see sent emails</li>
            <li>Verify your sending domain is configured in Resend</li>
            <li>Check that the API key has the correct permissions</li>
            <li>Look for console logs during signup to see if emails are being sent</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

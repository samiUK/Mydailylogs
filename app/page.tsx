import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MydailylogsLogo } from "@/components/mydailylogs-logo"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="flex justify-center mb-6">
            <MydailylogsLogo size="xl" />
          </div>
        </div>

        <div className="space-y-4">
          <a
            href="/auth/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
          >
            Sign In
          </a>
          <a
            href="/auth/sign-up"
            className="w-full flex justify-center py-3 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  )
}

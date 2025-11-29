import type { Metadata } from "next"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Cookie } from "lucide-react"

export const metadata: Metadata = {
  title: "Cookie Policy - MyDayLogs",
  description:
    "MyDayLogs Cookie Policy explains how we use cookies and similar tracking technologies. Learn about essential, analytics, and preference cookies, and how to manage your cookie settings.",
  keywords: ["cookie policy", "cookies", "tracking technologies", "cookie consent", "privacy cookies UK"],
  openGraph: {
    title: "Cookie Policy - MyDayLogs",
    description: "Understand how we use cookies and manage your cookie preferences.",
    url: "https://www.mydaylogs.co.uk/cookies",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/cookies",
  },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/">
            <MyDayLogsLogo size="md" />
          </Link>
          <nav className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost">Privacy Policy</Button>
            </Link>
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="gap-2 bg-transparent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-12">
          <Cookie className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn how MyDayLogs uses cookies and similar technologies to improve your experience.
          </p>
        </div>

        <div className="prose prose-lg max-w-4xl mx-auto">
          <section className="mb-8">
            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit our website. They help us provide you
              with a better experience by remembering your preferences and understanding how you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2>Types of Cookies We Use</h2>

            <h3>Essential Cookies</h3>
            <p>
              These cookies are necessary for the Service to function properly. They enable core functionality like
              security, authentication, and basic features. You cannot opt out of these cookies.
            </p>
            <ul>
              <li>Authentication and session management</li>
              <li>Security features</li>
              <li>Load balancing</li>
            </ul>

            <h3>Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our Service by collecting anonymous
              information about page visits, time spent, and usage patterns.
            </p>
            <ul>
              <li>Usage statistics</li>
              <li>Performance monitoring</li>
              <li>Error tracking</li>
            </ul>

            <h3>Preference Cookies</h3>
            <p>These cookies remember your preferences and settings to provide a more personalized experience.</p>
            <ul>
              <li>Language preferences</li>
              <li>Display settings</li>
              <li>Cookie consent choices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>Managing Your Cookie Preferences</h2>
            <p>You can control cookies through:</p>
            <ul>
              <li>
                <strong>Our Cookie Banner:</strong> Adjust your preferences when you first visit our site
              </li>
              <li>
                <strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies
              </li>
              <li>
                <strong>Privacy Settings:</strong> Manage preferences in your account settings
              </li>
            </ul>
            <p>Please note that disabling essential cookies may affect the functionality of the Service.</p>
          </section>

          <section className="mb-8">
            <h2>Third-Party Cookies</h2>
            <p>We may use trusted third-party services that set their own cookies:</p>
            <ul>
              <li>
                <strong>Stripe:</strong> Payment processing (essential)
              </li>
              <li>
                <strong>Analytics Services:</strong> Usage tracking (optional)
              </li>
            </ul>
            <p>These third parties have their own cookie policies, which we encourage you to review.</p>
          </section>

          <section className="mb-8">
            <h2>Cookie Retention</h2>
            <p>Different cookies are stored for different periods:</p>
            <ul>
              <li>
                <strong>Session Cookies:</strong> Deleted when you close your browser
              </li>
              <li>
                <strong>Persistent Cookies:</strong> Remain for a set period (typically 30 days to 1 year)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated
              revision date.
            </p>
          </section>

          <section className="mb-8">
            <h2>Contact Us</h2>
            <p>If you have questions about our use of cookies, please contact us:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1">Email: info@mydaylogs.co.uk</p>
              <p>Company: MyDayLogs Ltd</p>
            </div>
          </section>
        </div>

        <div className="text-center mt-12">
          <Link href="/privacy">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Read Privacy Policy
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

import type { Metadata } from "next"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Shield, Users, Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "About Us - MyDayLogs",
  description:
    "Learn about MyDayLogs, the UK's leading compliance-first task management platform for SMEs. Discover our mission to simplify regulatory compliance and team management for small and medium businesses.",
  keywords: [
    "about mydaylogs",
    "UK compliance software",
    "SME task management company",
    "business compliance solutions",
  ],
  openGraph: {
    title: "About MyDayLogs - Compliance Task Management for UK SMEs",
    description: "Professional task management and compliance platform designed for UK small and medium enterprises.",
    url: "https://www.mydaylogs.co.uk/about",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/about",
  },
}

export default function AboutPage() {
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
            <Link href="/contact">
              <Button variant="ghost">Contact</Button>
            </Link>
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About MyDayLogs</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional compliance task management platform designed for UK small and medium enterprises across
            multiple industries.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-16 space-y-12">
          <section className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              MyDayLogs was founded to address a critical need in UK industries: a comprehensive, compliant, and
              intuitive platform for managing daily operations, tasks, and team accountability. We believe that
              effective task management shouldn't be complicated, and compliance shouldn't be a burden.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">What We Do</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              We provide organizations with the tools they need to streamline operations, maintain compliance records,
              and empower teams to work more efficiently. Our platform serves businesses across construction,
              healthcare, education, retail, and professional services sectors throughout the UK.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose MyDayLogs?</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Shield className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-gray-900">UK GDPR Compliant</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Built with UK data protection regulations at the core, ensuring your data is secure and compliant.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Users className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Team-Focused</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Designed for organizations with multiple teams, roles, and complex workflows.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Zap className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Easy to Use</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Intuitive interface that your team can start using immediately, with minimal training required.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">Our Commitment</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              We are committed to providing UK businesses with a reliable, secure, and continuously improving platform.
              Our team is based in the UK and understands the unique challenges faced by British enterprises. We comply
              with all relevant UK regulations including UK GDPR, and we're dedicated to protecting your data and
              privacy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">Company Information</h2>
            <div className="bg-gray-50 p-8 rounded-lg space-y-3">
              <p className="text-base text-gray-700">
                <strong className="font-semibold text-gray-900">Registered Name:</strong> MyDayLogs Ltd
              </p>
              <p className="text-base text-gray-700">
                <strong className="font-semibold text-gray-900">Location:</strong> United Kingdom
              </p>
              <p className="text-base text-gray-700">
                <strong className="font-semibold text-gray-900">Email:</strong> info@mydaylogs.co.uk
              </p>
              <p className="text-base text-gray-700">
                <strong className="font-semibold text-gray-900">Data Protection:</strong> UK GDPR Compliant
              </p>
            </div>
          </section>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

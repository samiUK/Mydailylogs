import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Shield, Users, Zap, Check } from 'lucide-react'

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
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About MyDayLogs</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional task management and compliance platform designed for multi-industry enterprises across the United Kingdom.
          </p>
        </div>

        <div className="prose prose-lg max-w-4xl mx-auto mb-16">
          <h2>Our Mission</h2>
          <p>
            MyDayLogs was founded to address a critical need in UK industries: a comprehensive, compliant, and intuitive platform for managing daily operations, tasks, and team accountability. We believe that effective task management shouldn't be complicated, and compliance shouldn't be a burden.
          </p>

          <h2>What We Do</h2>
          <p>
            We provide organizations with the tools they need to streamline operations, maintain compliance records, and empower teams to work more efficiently. Our platform serves businesses across construction, healthcare, education, retail, and professional services sectors throughout the UK.
          </p>

          <h2>Why Choose MyDayLogs</h2>
          <div className="grid md:grid-cols-3 gap-6 not-prose my-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Shield className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">UK GDPR Compliant</h3>
              <p className="text-gray-600">
                Built with UK data protection regulations at the core, ensuring your data is secure and compliant.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Users className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team-Focused</h3>
              <p className="text-gray-600">
                Designed for organizations with multiple teams, roles, and complex workflows.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <Zap className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
              <p className="text-gray-600">
                Intuitive interface that your team can start using immediately, with minimal training required.
              </p>
            </div>
          </div>

          <h2>Our Commitment</h2>
          <p>
            We are committed to providing UK businesses with a reliable, secure, and continuously improving platform. Our team is based in the UK and understands the unique challenges faced by British enterprises. We comply with all relevant UK regulations including UK GDPR, and we're dedicated to protecting your data and privacy.
          </p>

          <h2>Company Information</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="mb-2"><strong>Registered Name:</strong> MyDayLogs Ltd</p>
            <p className="mb-2"><strong>Location:</strong> United Kingdom</p>
            <p className="mb-2"><strong>Email:</strong> info@mydaylogs.co.uk</p>
            <p className="mb-2"><strong>Data Protection:</strong> UK GDPR Compliant</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
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

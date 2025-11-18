import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Mail, MessageSquare, FileQuestion } from 'lucide-react'

export default function ContactPage() {
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
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">
            We're here to help. Choose the best way to reach us.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Email Support</h3>
            <p className="text-gray-600 mb-4">
              Get help with your account, billing, or technical issues.
            </p>
            <a href="mailto:info@mydaylogs.co.uk" className="text-emerald-600 hover:text-emerald-700 font-medium">
              info@mydaylogs.co.uk
            </a>
            <p className="text-sm text-gray-500 mt-2">Response within 24 hours</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <MessageSquare className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sales Enquiries</h3>
            <p className="text-gray-600 mb-4">
              Interested in MyDayLogs for your organization?
            </p>
            <a href="mailto:info@mydaylogs.co.uk" className="text-emerald-600 hover:text-emerald-700 font-medium">
              info@mydaylogs.co.uk
            </a>
            <p className="text-sm text-gray-500 mt-2">Let's discuss your needs</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <FileQuestion className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Help Center</h3>
            <p className="text-gray-600 mb-4">
              Browse documentation and common questions.
            </p>
            <Link href="/support" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Visit Support
            </Link>
            <p className="text-sm text-gray-500 mt-2">Self-service resources</p>
          </Card>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="john@company.co.uk"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Your Company Ltd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select a subject</option>
                <option value="sales">Sales Enquiry</option>
                <option value="support">Technical Support</option>
                <option value="billing">Billing Question</option>
                <option value="general">General Enquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Tell us how we can help..."
              />
            </div>
            <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
              Send Message
            </Button>
            <p className="text-sm text-gray-500 text-center">
              We typically respond within 24 hours during business days.
            </p>
          </form>
        </Card>

        <div className="mt-12 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
          <p className="text-gray-600 mb-2">Monday - Friday: 9:00 AM - 5:00 PM GMT</p>
          <p className="text-gray-600 mb-2">Saturday - Sunday: Closed</p>
          <p className="text-gray-600">Bank Holidays: Closed</p>
        </div>
      </main>
    </div>
  )
}

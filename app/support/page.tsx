import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Book, HelpCircle, Mail, FileText } from "lucide-react"

export default function SupportPage() {
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Support Center</h1>
          <p className="text-xl text-gray-600">Find answers, get help, and learn how to make the most of MyDayLogs.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Book className="w-12 h-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Getting Started</h3>
            <p className="text-gray-600 mb-4">
              New to MyDayLogs? Learn the basics and get your team up and running quickly.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• Setting up your organization</li>
              <li>• Adding team members</li>
              <li>• Creating your first task log</li>
              <li>• Understanding user roles</li>
            </ul>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <HelpCircle className="w-12 h-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Frequently Asked Questions</h3>
            <p className="text-gray-600 mb-4">Quick answers to common questions about MyDayLogs.</p>
            <ul className="space-y-2 text-gray-700">
              <li>• How do I upgrade my plan?</li>
              <li>• Can I export my data?</li>
              <li>• How is my data protected?</li>
              <li>• What happens to my data if I cancel?</li>
            </ul>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Mail className="w-12 h-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Email Support</h3>
            <p className="text-gray-600 mb-4">Can't find what you're looking for? Our support team is here to help.</p>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">General Support</p>
                <a href="mailto:info@mydaylogs.co.uk" className="text-emerald-600 hover:text-emerald-700">
                  info@mydaylogs.co.uk
                </a>
              </div>
              <p className="text-sm text-gray-500">Response time: Within 24 hours</p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <FileText className="w-12 h-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Account & Billing</h3>
            <p className="text-gray-600 mb-4">Manage your subscription, billing, and account settings.</p>
            <ul className="space-y-2 text-gray-700">
              <li>• Subscription management</li>
              <li>• Payment methods</li>
              <li>• Invoice history</li>
              <li>• Account security</li>
            </ul>
          </Card>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Common Support Topics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Account Management</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Resetting your password</li>
                <li>• Changing email address</li>
                <li>• Managing team permissions</li>
                <li>• Deleting your account</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Technical Issues</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Login problems</li>
                <li>• Browser compatibility</li>
                <li>• Data synchronization</li>
                <li>• Performance issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Features & Usage</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Task templates</li>
                <li>• Report generation</li>
                <li>• Team collaboration</li>
                <li>• Notification settings</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Compliance & Security</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• UK GDPR compliance</li>
                <li>• Data retention policies</li>
                <li>• Security best practices</li>
                <li>• Audit logs</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-gray-600 mb-6">Our support team is ready to assist you with any questions or issues.</p>
          <Link href="/contact">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Contact Support
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

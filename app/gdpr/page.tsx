import type { Metadata } from "next"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Shield, Lock, FileText, Download, Trash2, Eye } from "lucide-react"

export const metadata: Metadata = {
  title: "UK GDPR Compliance & Your Data Rights - MyDayLogs",
  description:
    "Understand your UK GDPR data rights with MyDayLogs. Learn about data access, rectification, erasure, portability, and how we protect your personal information under UK data protection laws.",
  keywords: [
    "UK GDPR",
    "data rights",
    "GDPR compliance",
    "data protection rights",
    "right to erasure",
    "data portability",
    "ICO compliance",
  ],
  openGraph: {
    title: "UK GDPR Compliance & Data Rights - MyDayLogs",
    description: "Your comprehensive guide to data protection rights under UK GDPR.",
    url: "https://www.mydaylogs.co.uk/gdpr",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/gdpr",
  },
}

export default function GDPRPage() {
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
          <Shield className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-gray-900 mb-4">UK GDPR Compliance</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your data protection rights and how MyDayLogs complies with UK GDPR and the Data Protection Act 2018.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6">
            <Eye className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Access</h3>
            <p className="text-gray-600 mb-4">
              You have the right to request a copy of all personal data we hold about you.
            </p>
            <p className="text-sm text-gray-500">
              Email info@mydaylogs.co.uk to request your data. We will respond within 30 days.
            </p>
          </Card>

          <Card className="p-6">
            <FileText className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Rectification</h3>
            <p className="text-gray-600 mb-4">
              You can correct any inaccurate or incomplete personal data we hold about you.
            </p>
            <p className="text-sm text-gray-500">
              Update your information directly in your account settings or contact our support team.
            </p>
          </Card>

          <Card className="p-6">
            <Trash2 className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Erasure</h3>
            <p className="text-gray-600 mb-4">
              You have the right to request deletion of your personal data in certain circumstances.
            </p>
            <p className="text-sm text-gray-500">
              Delete your account or contact us to request data deletion. We will comply within 30 days.
            </p>
          </Card>

          <Card className="p-6">
            <Download className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Data Portability</h3>
            <p className="text-gray-600 mb-4">
              You can receive your personal data in a structured, commonly used format.
            </p>
            <p className="text-sm text-gray-500">
              Export your data from your account or request a complete data package from us.
            </p>
          </Card>

          <Card className="p-6">
            <Lock className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Restriction</h3>
            <p className="text-gray-600 mb-4">
              You can request that we limit how we use your personal data in certain situations.
            </p>
            <p className="text-sm text-gray-500">Contact us to discuss restricting the processing of your data.</p>
          </Card>

          <Card className="p-6">
            <Shield className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Right to Object</h3>
            <p className="text-gray-600 mb-4">
              You can object to processing of your data based on our legitimate interests.
            </p>
            <p className="text-sm text-gray-500">Email us to object to specific processing activities.</p>
          </Card>
        </div>

        <div className="prose prose-lg max-w-4xl mx-auto mb-12">
          <h2>Our UK GDPR Commitments</h2>

          <h3>Data Protection Principles</h3>
          <p>
            MyDayLogs processes your personal data in accordance with the six data protection principles under UK GDPR:
          </p>
          <ol>
            <li>
              <strong>Lawfulness, fairness, and transparency:</strong> We process data lawfully and transparently
            </li>
            <li>
              <strong>Purpose limitation:</strong> We collect data for specific, legitimate purposes
            </li>
            <li>
              <strong>Data minimization:</strong> We only collect data that is necessary
            </li>
            <li>
              <strong>Accuracy:</strong> We keep your data accurate and up to date
            </li>
            <li>
              <strong>Storage limitation:</strong> We don't keep data longer than necessary
            </li>
            <li>
              <strong>Integrity and confidentiality:</strong> We protect your data with appropriate security measures
            </li>
          </ol>

          <h3>Legal Basis for Processing</h3>
          <p>We process your personal data under the following legal bases:</p>
          <ul>
            <li>
              <strong>Contract:</strong> To provide the Service you've signed up for
            </li>
            <li>
              <strong>Legitimate Interests:</strong> To improve our Service and prevent fraud
            </li>
            <li>
              <strong>Legal Obligation:</strong> To comply with UK laws
            </li>
            <li>
              <strong>Consent:</strong> For marketing communications (where applicable)
            </li>
          </ul>

          <h3>Data Security Measures</h3>
          <p>We implement industry-standard security measures including:</p>
          <ul>
            <li>End-to-end encryption for data transmission</li>
            <li>Encryption at rest for stored data</li>
            <li>Regular security audits and penetration testing</li>
            <li>Strict access controls and authentication</li>
            <li>Employee training on data protection</li>
            <li>Incident response procedures</li>
          </ul>

          <h3>Data Processors and International Transfers</h3>
          <p>
            We work with trusted service providers who act as data processors. All processors are required to comply
            with UK GDPR standards.
          </p>
          <p>
            Your data is primarily stored in the UK and EU. Any international data transfers comply with UK GDPR
            requirements using Standard Contractual Clauses or other approved mechanisms.
          </p>

          <h3>Data Breach Notification</h3>
          <p>
            In the unlikely event of a data breach that poses a risk to your rights and freedoms, we will notify you and
            the ICO within 72 hours as required by UK GDPR.
          </p>

          <h3>Data Protection Impact Assessments</h3>
          <p>
            We conduct Data Protection Impact Assessments (DPIAs) for processing activities that may pose high risks to
            your data protection rights.
          </p>

          <h3>Your Organization's Responsibilities</h3>
          <p>
            If you use MyDayLogs to process personal data of others (employees, clients, etc.), you are responsible for:
          </p>
          <ul>
            <li>Obtaining appropriate consent or establishing legal basis</li>
            <li>Providing privacy notices to data subjects</li>
            <li>Responding to data subject rights requests</li>
            <li>Ensuring compliance with UK GDPR in your use of the Service</li>
          </ul>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Exercising Your Rights</h2>
          <p className="text-gray-700 mb-4">To exercise any of your UK GDPR rights, please contact us:</p>
          <div className="bg-white p-4 rounded-lg mb-4">
            <p className="mb-1">
              <strong>Email:</strong> info@mydaylogs.co.uk
            </p>
            <p>
              <strong>Company:</strong> MyDayLogs Ltd, United Kingdom
            </p>
          </div>
          <p className="text-gray-700 mb-4">
            We will respond to your request within 30 days. There is no charge for most requests unless they are
            manifestly unfounded or excessive.
          </p>
          <p className="text-sm text-gray-600">
            We may need to verify your identity before processing your request to ensure we're protecting your data.
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Complaints and Escalation</h2>
          <p className="text-gray-700 mb-4">
            If you're not satisfied with how we've handled your data or responded to your request, you have the right to
            lodge a complaint with the UK supervisory authority:
          </p>
          <div className="bg-white p-6 rounded-lg">
            <p className="font-semibold text-lg mb-2">Information Commissioner's Office (ICO)</p>
            <p className="mb-1">
              Website:{" "}
              <a href="https://ico.org.uk" className="text-emerald-600 hover:text-emerald-700">
                https://ico.org.uk
              </a>
            </p>
            <p className="mb-1">Telephone: 0303 123 1113</p>
            <p className="mb-1">Address: Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/privacy">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Read Full Privacy Policy
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

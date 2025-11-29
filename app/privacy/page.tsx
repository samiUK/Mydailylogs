import type { Metadata } from "next"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy - MyDayLogs",
  description:
    "MyDayLogs Privacy Policy explains how we collect, use, and protect your personal information in compliance with UK GDPR and Data Protection Act 2018. UK-based data storage with full transparency.",
  keywords: ["privacy policy", "UK GDPR", "data protection", "personal data", "data privacy UK"],
  openGraph: {
    title: "Privacy Policy - MyDayLogs",
    description: "Comprehensive privacy policy explaining data collection, usage, and protection practices.",
    url: "https://www.mydaylogs.co.uk/privacy",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/privacy",
  },
}

export default function PrivacyPage() {
  const lastUpdated = "29 November 2024"

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/">
            <MyDayLogsLogo size="md" />
          </Link>
          <nav className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2>1. Introduction</h2>
            <p>
              MyDayLogs Ltd ("we", "our", "us") is committed to protecting and respecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use our task
              management platform and services (the "Service").
            </p>
            <p>
              We are committed to complying with the UK General Data Protection Regulation (UK GDPR) and the Data
              Protection Act 2018. This policy should be read alongside our Terms of Service.
            </p>
          </section>

          <section className="mb-8">
            <h2>2. Data Controller</h2>
            <p>
              MyDayLogs Ltd is the data controller responsible for your personal information. If you have any questions
              about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1">Email: info@mydaylogs.co.uk</p>
              <p>Address: United Kingdom</p>
            </div>
          </section>

          <section className="mb-8">
            <h2>3. Information We Collect</h2>

            <h3>3.1 Information You Provide</h3>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, password, organization name
              </li>
              <li>
                <strong>Profile Information:</strong> Job title, contact details, profile photo (optional)
              </li>
              <li>
                <strong>Task Data:</strong> Task logs, notes, templates, attachments you create or upload
              </li>
              <li>
                <strong>Communication Data:</strong> Messages, feedback, and support requests
              </li>
              <li>
                <strong>Billing Information:</strong> Payment details (processed securely by Stripe)
              </li>
            </ul>

            <h3>3.2 Information Collected Automatically</h3>
            <p>When you use our Service, we automatically collect:</p>
            <ul>
              <li>
                <strong>Usage Data:</strong> Pages viewed, features used, time spent on the platform
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, IP address
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong> See our Cookie Policy for details
              </li>
              <li>
                <strong>Log Data:</strong> Access times, error logs, system activity
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>4. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li>
                <strong>Service Provision:</strong> To provide, maintain, and improve our Service
              </li>
              <li>
                <strong>Account Management:</strong> To manage your account and authenticate users
              </li>
              <li>
                <strong>Communication:</strong> To send service updates, security alerts, and support messages
              </li>
              <li>
                <strong>Billing:</strong> To process payments and manage subscriptions
              </li>
              <li>
                <strong>Analytics:</strong> To understand usage patterns and improve user experience
              </li>
              <li>
                <strong>Compliance:</strong> To comply with legal obligations and enforce our terms
              </li>
              <li>
                <strong>Security:</strong> To detect, prevent, and address security issues
              </li>
              <li>
                <strong>Customer Support:</strong> To provide technical assistance, troubleshoot issues, and respond to
                support requests
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>5. Legal Basis for Processing (UK GDPR)</h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul>
              <li>
                <strong>Contract Performance:</strong> Processing necessary to provide the Service
              </li>
              <li>
                <strong>Legitimate Interests:</strong> Improving our Service, security, and fraud prevention
              </li>
              <li>
                <strong>Legal Obligation:</strong> Compliance with UK laws and regulations
              </li>
              <li>
                <strong>Consent:</strong> Marketing communications (where required)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information with:</p>

            <h3>6.1 Service Providers</h3>
            <ul>
              <li>
                <strong>Hosting:</strong> Vercel (website hosting)
              </li>
              <li>
                <strong>Database:</strong> Supabase (data storage)
              </li>
              <li>
                <strong>Payments:</strong> Stripe (payment processing)
              </li>
              <li>
                <strong>Email:</strong> Resend (transactional emails)
              </li>
            </ul>

            <h3>6.2 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or legal process, or to protect our
              rights and safety.
            </p>

            <h3>6.3 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as
              part of that transaction.
            </p>
          </section>

          <section className="mb-8">
            <h2>7. Administrative Access and Support</h2>

            <h3>7.1 Access for Technical Support</h3>
            <p>
              To provide technical support, troubleshoot issues, and maintain service quality, authorized administrators
              may occasionally need to access user accounts. This access is conducted under the following conditions:
            </p>
            <ul>
              <li>
                <strong>Legitimate Purpose:</strong> Access is only granted for legitimate purposes including technical
                support, troubleshooting system issues, resolving billing inquiries, investigating security incidents,
                or ensuring regulatory compliance
              </li>
              <li>
                <strong>Authorized Personnel Only:</strong> Only specifically authorized senior administrators with
                proper security clearance can access user accounts
              </li>
              <li>
                <strong>Secure Authentication:</strong> Administrative access requires secure authentication credentials
                that are separate from user passwords. Your password remains encrypted and is never visible to
                administrators
              </li>
              <li>
                <strong>Complete Audit Trail:</strong> All administrative access to user accounts is automatically
                logged with timestamps, administrator identity, and purpose. These logs are retained for compliance
                purposes
              </li>
              <li>
                <strong>Minimal Data Viewing:</strong> Administrators only view the minimum data necessary to resolve
                the specific issue or provide the requested support
              </li>
              <li>
                <strong>Confidentiality:</strong> All administrators are bound by strict confidentiality agreements and
                data protection policies
              </li>
            </ul>

            <h3>7.2 Your Rights Regarding Administrative Access</h3>
            <p>You have the right to:</p>
            <ul>
              <li>Request information about whether your account has been accessed by administrators</li>
              <li>
                Request copies of audit logs showing administrative access to your account (Subject Access Request)
              </li>
              <li>Object to administrative access except where required for legal compliance or security purposes</li>
              <li>Lodge a complaint with the ICO if you believe access was inappropriate</li>
            </ul>
            <p>
              To request information about administrative access to your account, please contact us at
              info@mydaylogs.co.uk with "Administrative Access Request" in the subject line.
            </p>
          </section>

          <section className="mb-8">
            <h2>8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and comply with legal
              obligations. When you delete your account, we will delete or anonymize your personal data within 30 days,
              except where we are required to retain it for legal or regulatory purposes.
            </p>
            <p>
              Task logs and organizational data are retained according to your subscription plan and may be retained for
              audit purposes as required by law. Administrative access logs are retained for a minimum of 3 years for
              compliance and security purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2>9. Your Rights Under UK GDPR</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li>
                <strong>Right of Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate or incomplete data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Right to Restriction:</strong> Limit how we use your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in a portable format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing based on legitimate interests
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Where processing is based on consent
              </li>
            </ul>
            <p>To exercise these rights, please contact us at info@mydaylogs.co.uk. We will respond within 30 days.</p>
          </section>

          <section className="mb-8">
            <h2>10. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information,
              including:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication</li>
              <li>Secure data centers in the UK/EU</li>
              <li>Employee training on data protection</li>
              <li>Password hashing using industry-standard algorithms (bcrypt)</li>
              <li>Comprehensive audit logging of all administrative actions</li>
              <li>Multi-factor authentication for administrative accounts</li>
            </ul>
            <p>
              While we strive to protect your personal information, no method of transmission over the internet is 100%
              secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2>11. International Data Transfers</h2>
            <p>
              Your data is primarily stored and processed in the UK and EU. If we transfer data outside the UK, we
              ensure appropriate safeguards are in place, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses approved by the UK ICO</li>
              <li>Adequacy decisions by the UK government</li>
              <li>Other approved transfer mechanisms under UK GDPR</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>12. Children's Privacy</h2>
            <p>
              Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal
              information from children. If you believe we have collected information from a child, please contact us
              immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2>13. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to improve your experience. Essential cookies are necessary for
              the Service to function. You can control non-essential cookies through our cookie banner and browser
              settings. For more information, see our Cookie Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2>14. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new policy on this page and updating the "Last updated" date. Continued use of the Service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2>15. Contact Us and Complaints</h2>
            <p>
              If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please
              contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="mb-1">Email: info@mydaylogs.co.uk</p>
              <p>Company: MyDayLogs Ltd</p>
            </div>
            <p>You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO):</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1">Website: https://ico.org.uk</p>
              <p className="mb-1">Telephone: 0303 123 1113</p>
              <p>Address: Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

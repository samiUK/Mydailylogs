import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PrivacyPage() {
  const lastUpdated = "17 November 2024"

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2>1. Introduction</h2>
            <p>
              MyDayLogs Ltd ("we", "our", "us") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our task management platform and services (the "Service").
            </p>
            <p>
              We are committed to complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This policy should be read alongside our Terms of Service.
            </p>
          </section>

          <section className="mb-8">
            <h2>2. Data Controller</h2>
            <p>
              MyDayLogs Ltd is the data controller responsible for your personal information. If you have any questions about this Privacy Policy or our data practices, please contact us at:
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
              <li><strong>Account Information:</strong> Name, email address, password, organization name</li>
              <li><strong>Profile Information:</strong> Job title, contact details, profile photo (optional)</li>
              <li><strong>Task Data:</strong> Task logs, notes, templates, attachments you create or upload</li>
              <li><strong>Communication Data:</strong> Messages, feedback, and support requests</li>
              <li><strong>Billing Information:</strong> Payment details (processed securely by Stripe)</li>
            </ul>

            <h3>3.2 Information Collected Automatically</h3>
            <p>When you use our Service, we automatically collect:</p>
            <ul>
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the platform</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Cookies and Similar Technologies:</strong> See our Cookie Policy for details</li>
              <li><strong>Log Data:</strong> Access times, error logs, system activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>4. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li><strong>Service Provision:</strong> To provide, maintain, and improve our Service</li>
              <li><strong>Account Management:</strong> To manage your account and authenticate users</li>
              <li><strong>Communication:</strong> To send service updates, security alerts, and support messages</li>
              <li><strong>Billing:</strong> To process payments and manage subscriptions</li>
              <li><strong>Analytics:</strong> To understand usage patterns and improve user experience</li>
              <li><strong>Compliance:</strong> To comply with legal obligations and enforce our terms</li>
              <li><strong>Security:</strong> To detect, prevent, and address security issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>5. Legal Basis for Processing (UK GDPR)</h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul>
              <li><strong>Contract Performance:</strong> Processing necessary to provide the Service</li>
              <li><strong>Legitimate Interests:</strong> Improving our Service, security, and fraud prevention</li>
              <li><strong>Legal Obligation:</strong> Compliance with UK laws and regulations</li>
              <li><strong>Consent:</strong> Marketing communications (where required)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            
            <h3>6.1 Service Providers</h3>
            <ul>
              <li><strong>Hosting:</strong> Vercel (website hosting)</li>
              <li><strong>Database:</strong> Supabase (data storage)</li>
              <li><strong>Payments:</strong> Stripe (payment processing)</li>
              <li><strong>Email:</strong> Zoho Mail (transactional emails)</li>
            </ul>

            <h3>6.2 Legal Requirements</h3>
            <p>We may disclose your information if required by law, court order, or legal process, or to protect our rights and safety.</p>

            <h3>6.3 Business Transfers</h3>
            <p>If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
          </section>

          <section className="mb-8">
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and comply with legal obligations. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.
            </p>
            <p>
              Task logs and organizational data are retained according to your subscription plan and may be retained for audit purposes as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2>8. Your Rights Under UK GDPR</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Right to Restriction:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at info@mydaylogs.co.uk. We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2>9. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication</li>
              <li>Secure data centers in the UK/EU</li>
              <li>Employee training on data protection</li>
            </ul>
            <p>
              While we strive to protect your personal information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2>10. International Data Transfers</h2>
            <p>
              Your data is primarily stored and processed in the UK and EU. If we transfer data outside the UK, we ensure appropriate safeguards are in place, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses approved by the UK ICO</li>
              <li>Adequacy decisions by the UK government</li>
              <li>Other approved transfer mechanisms under UK GDPR</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>11. Children's Privacy</h2>
            <p>
              Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2>12. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to improve your experience. Essential cookies are necessary for the Service to function. You can control non-essential cookies through our cookie banner and browser settings. For more information, see our Cookie Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2>13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2>14. Contact Us and Complaints</h2>
            <p>
              If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="mb-1">Email: info@mydaylogs.co.uk</p>
              <p>Company: MyDayLogs Ltd</p>
            </div>
            <p>
              You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO):
            </p>
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

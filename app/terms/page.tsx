import type { Metadata } from "next"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service - MyDayLogs",
  description:
    "MyDayLogs Terms of Service outline the rules and guidelines for using our compliance task management platform. Includes subscription terms, acceptable use policy, and user rights.",
  keywords: ["terms of service", "user agreement", "service terms", "legal terms"],
  openGraph: {
    title: "Terms of Service - MyDayLogs",
    description: "Legal terms and conditions for using the MyDayLogs platform.",
    url: "https://www.mydaylogs.co.uk/terms",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/terms",
  },
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2>1. Agreement to Terms</h2>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you and MyDayLogs Ltd
              ("Company", "we", "us", "our") concerning your access to and use of the MyDayLogs platform and services
              (the "Service").
            </p>
            <p>
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these
              Terms, you may not access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2>2. Eligibility</h2>
            <p>
              You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that
              you meet this age requirement and have the legal capacity to enter into these Terms.
            </p>
            <p>
              If you are using the Service on behalf of an organization, you represent that you have authority to bind
              that organization to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2>3. Account Registration</h2>
            <p>To use certain features of the Service, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate and current</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or are inactive for
              extended periods.
            </p>
          </section>

          <section className="mb-8">
            <h2>4. Subscription Plans and Billing</h2>

            <h3>4.1 Plans</h3>
            <p>
              We offer multiple subscription plans, including a free Starter plan and paid Growth and Scale plans. All
              paid plans include a 30-day free trial. You will be charged on the 31st day after starting your trial
              unless you cancel before then.
            </p>

            <h3>4.2 Billing</h3>
            <p>
              By subscribing to a paid plan, you authorize us to charge your payment method on a recurring basis
              (monthly). Charges occur at the beginning of each billing cycle and are non-refundable except as required
              by law.
            </p>

            <h3>4.3 Payment Processing</h3>
            <p>
              Payments are processed securely by Stripe. We do not store your complete payment card details. You agree
              to Stripe's terms and conditions.
            </p>

            <h3>4.4 Price Changes</h3>
            <p>
              We may change our prices with at least 30 days' notice. Continued use of the Service after price changes
              constitutes acceptance of the new prices.
            </p>

            <h3>4.5 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing
              period. You will continue to have access to paid features until the end of the paid period.
            </p>
          </section>

          <section className="mb-8">
            <h2>5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful code (viruses, malware, etc.)</li>
              <li>Harass, abuse, or harm others</li>
              <li>Impersonate others or provide false information</li>
              <li>Interfere with the Service or servers</li>
              <li>Access the Service through automated means without permission</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>6. Intellectual Property Rights</h2>

            <h3>6.1 Our Rights</h3>
            <p>
              The Service, including all content, features, and functionality, is owned by MyDayLogs Ltd and is
              protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h3>6.2 Your Rights</h3>
            <p>
              You retain all rights to the content you create and upload to the Service ("User Content"). By using the
              Service, you grant us a limited license to use, store, and display your User Content solely to provide the
              Service.
            </p>

            <h3>6.3 Feedback</h3>
            <p>
              If you provide feedback or suggestions about the Service, we may use that feedback without any obligation
              to you.
            </p>
          </section>

          <section className="mb-8">
            <h2>7. Data and Privacy</h2>
            <p>
              Your use of the Service is subject to our Privacy Policy, which explains how we collect, use, and protect
              your personal information in compliance with applicable data protection regulations.
            </p>
            <p>
              You are responsible for ensuring that your use of the Service complies with applicable data protection
              laws, particularly when handling personal data of your team members or clients.
            </p>
          </section>

          <section className="mb-8">
            <h2>8. Service Availability</h2>
            <p>We strive to provide reliable service but do not guarantee that:</p>
            <ul>
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>Defects will be corrected</li>
              <li>The Service will meet your specific requirements</li>
            </ul>
            <p>We may modify, suspend, or discontinue any part of the Service at any time with reasonable notice.</p>
          </section>

          <section className="mb-8">
            <h2>9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by applicable law:</p>
            <ul>
              <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages</li>
              <li>
                Our total liability for any claim related to the Service is limited to the amount you paid us in the 12
                months before the claim arose
              </li>
              <li>We are not liable for any loss of data, profits, revenue, or business opportunities</li>
            </ul>
            <p>
              Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence,
              fraud, or any other liability that cannot be excluded under applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless MyDayLogs Ltd from any claims, damages, losses, or expenses
              (including legal fees) arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your User Content</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2>11. Termination</h2>
            <p>We may suspend or terminate your access to the Service immediately if:</p>
            <ul>
              <li>You violate these Terms</li>
              <li>Your account is inactive for an extended period</li>
              <li>Required by law or legal process</li>
              <li>We discontinue the Service</li>
            </ul>
            <p>
              Upon termination, you must stop using the Service. We may delete your account and User Content after
              termination.
            </p>
          </section>

          <section className="mb-8">
            <h2>12. Governing Law and Jurisdiction</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or the
              Service will be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section className="mb-8">
            <h2>13. Dispute Resolution</h2>
            <p>
              Before filing a legal claim, we encourage you to contact us at info@mydaylogs.co.uk to resolve disputes
              informally. If we cannot resolve the dispute within 30 days, either party may pursue formal legal
              remedies.
            </p>
          </section>

          <section className="mb-8">
            <h2>14. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify you of material changes by email or through the
              Service. Your continued use of the Service after changes take effect constitutes acceptance of the
              modified Terms.
            </p>
            <p>If you do not agree to the modified Terms, you must stop using the Service.</p>
          </section>

          <section className="mb-8">
            <h2>15. General Provisions</h2>

            <h3>15.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and MyDayLogs
              Ltd regarding the Service.
            </p>

            <h3>15.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in
              effect.
            </p>

            <h3>15.3 Waiver</h3>
            <p>Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.</p>

            <h3>15.4 Assignment</h3>
            <p>
              You may not assign these Terms without our written consent. We may assign these Terms without restriction.
            </p>
          </section>

          <section className="mb-8">
            <h2>16. Contact Information</h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1">
                <strong>MyDayLogs Ltd</strong>
              </p>
              <p className="mb-1">Email: info@mydaylogs.co.uk</p>
            </div>
          </section>

          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg mt-8">
            <p className="font-semibold mb-2">
              By using MyDayLogs, you acknowledge that you have read, understood, and agree to be bound by these Terms
              of Service.
            </p>
            <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

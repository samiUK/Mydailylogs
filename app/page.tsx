import { createClient } from "@/lib/supabase/server"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  CheckCircle,
  Shield,
  BarChart3,
  Users,
  Clock,
  FileText,
  Star,
  Menu,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { FeedbackModal } from "@/components/feedback-modal"
import CookieConsent from "@/components/cookie-consent"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MyDayLogs",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "GBP",
    lowPrice: "0",
    highPrice: "79",
    offerCount: "3",
    offers: [
      {
        "@type": "Offer",
        name: "Starter Plan",
        price: "0",
        priceCurrency: "GBP",
      },
      {
        "@type": "Offer",
        name: "Growth Plan",
        price: "29",
        priceCurrency: "GBP",
      },
      {
        "@type": "Offer",
        name: "Scale Plan",
        price: "79",
        priceCurrency: "GBP",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
  },
  description:
    "Compliance-first task management platform built for UK SMEs. Streamline audit-ready reporting, automate compliance tracking, and manage team tasks with GDPR-compliant tools.",
  featureList: [
    "Custom Template Creation",
    "Task Assignment & Tracking",
    "Audit-Ready Reporting",
    "GDPR Compliance",
    "Team Management",
    "Email Notifications",
    "Progress Monitoring",
  ],
  screenshot: "https://www.mydaylogs.co.uk/og-image.png",
  softwareVersion: "2.0",
  releaseNotes: "Beta 2.0 - Enhanced compliance features and improved user experience",
}

export default async function HomePage() {
  let user = null
  const profile = null

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  user = authUser

  if (user) {
    // Fetch user profiles to determine where to redirect
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, role, organization_name")
      .eq("email", user.email)

    if (userProfiles && userProfiles.length > 0) {
      // If user has multiple profiles, redirect to profile selection
      if (userProfiles.length > 1) {
        redirect("/profile")
      } else {
        // Single profile, redirect to appropriate dashboard
        const profile = userProfiles[0]

        if (profile.role === "admin") {
          redirect(`/admin`)
        } else if (profile.role === "staff") {
          redirect(`/staff`)
        } else {
          redirect(`/admin`)
        }
      }
    } else {
      // No profile found, redirect to login
      redirect("/auth/login?error=no_profile_found")
    }
  }

  const currentDate = new Date()
  const showBanner = true // Always show banner during beta period

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      {showBanner && (
        <div className="bg-accent text-accent-foreground py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>
                🚀 You're using the Beta version of MyDayLogs. Things may change, and we'd love your feedback!
              </span>
            </div>
            <FeedbackModal
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="!bg-orange-500 hover:!bg-orange-600 !text-white !border-orange-400 hover:!border-orange-300 h-8 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give Feedback
                </Button>
              }
            />
          </div>
        </div>
      )}

      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MyDayLogsLogo size="md" />
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Reviews
              </a>
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-accent hover:bg-accent/90">Get Started Free</Button>
              </Link>
            </div>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center mb-8 mt-6">
                      <MyDayLogsLogo size="sm" />
                    </div>

                    <div className="flex flex-col space-y-6 mb-8">
                      <a
                        href="#features"
                        className="text-lg font-medium hover:text-accent transition-colors flex items-center"
                      >
                        <Shield className="w-5 h-5 mr-3 text-accent" />
                        Features
                      </a>
                      <a
                        href="#pricing"
                        className="text-lg font-medium hover:text-accent transition-colors flex items-center"
                      >
                        <BarChart3 className="w-5 h-5 mr-3 text-accent" />
                        Pricing
                      </a>
                      <a
                        href="#testimonials"
                        className="text-lg font-medium hover:text-accent transition-colors flex items-center"
                      >
                        <Star className="w-5 h-5 mr-3 text-accent" />
                        Reviews
                      </a>
                    </div>

                    <div className="mt-auto mb-6">
                      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                        <div className="text-center mb-4">
                          <h3 className="font-semibold text-foreground mb-2">Ready to get started?</h3>
                          <p className="text-sm text-muted-foreground">
                            Join thousands of businesses streamlining compliance and operations
                          </p>
                        </div>
                        <Link href="/auth/sign-up" className="block">
                          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-semibold">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Get Started Free
                          </Button>
                        </Link>
                        <Link href="/auth/login" className="block">
                          <Button
                            variant="outline"
                            className="w-full h-11 text-base border-2 hover:bg-muted bg-transparent"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <section className="px-4 sm:px-6 lg:px-8 py-0">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-sm font-semibold">
            🎉 Now in Beta 2.0
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground py-1 mb-7 mt-[70px]">
            Compliance-Ready Task Management
            <span className="text-accent block">& Reporting System for UK SMEs</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Professional task management with audit-ready reporting built specifically for UK small and medium
            enterprises. Generate compliance reports with business letterheads, timestamps, and signatures that meet
            regulatory standards. Automate workflows, track deadlines, and maintain complete audit trails—all without
            enterprise complexity or cost.
          </p>
        </div>
      </section>

      <section className="w-full">
        <img
          src="/images/design-mode-images-ss-20on-20a-20laptop.png"
          alt="MyDayLogs Admin Dashboard"
          className="w-full h-auto object-cover"
        />
      </section>

      <section className="py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process designed for busy SME owners
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Sign Up & Setup</h3>
              <p className="text-muted-foreground">
                Create your account in under 2 minutes. Add your team members and customize your organization settings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Custom Templates</h3>
              <p className="text-muted-foreground">
                Build highly customizable templates tailored to your specific business and industry needs. Create
                unlimited task lists that adapt to your unique workflows and assign templates to team members for
                streamlined collaboration.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Track & Report</h3>
              <p className="text-muted-foreground">
                Track while every team member is completing task lists in real-time. Generate and save professional
                reports for regulatory and compliance needs that impress auditors and stakeholders.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Get started Now!
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Compliance Made Simple for SMEs</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything your growing business needs to stay compliant without the complexity or enterprise cost
            </p>
          </div>
          <div className="mb-20 bg-background rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-br from-accent/5 to-transparent">
                <Badge variant="secondary" className="mb-4 w-fit">
                  Sample Compliance Report
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Professional, Audit-Ready Reports
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Generate industry-standard compliance reports with your business letterhead, digital signatures, and
                  complete audit trails. Perfect for health & safety, ISO audits, GDPR documentation, and regulatory
                  inspections.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Professional formatting</strong> with company branding and
                      letterhead
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Complete audit trail</strong> with timestamps and signatures
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Optimized file sizes</strong> under 300KB for easy storage and
                      sharing
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Industry-standard PDF format</strong> accepted by all auditors
                    </span>
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                    Start Creating Reports Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="bg-muted/30 p-8 lg:p-12 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <div className="bg-background rounded-lg shadow-2xl border-2 border-border overflow-hidden transform hover:scale-105 transition-transform duration-300">
                    <img
                      src="/images/image.png"
                      alt="Sample Compliance Report - Professional audit-ready report with company letterhead, task completion details, and signatures"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Live example: Quarterly compliance report with full audit trail
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Compliance Templates</CardTitle>
                <CardDescription>
                  Pre-built templates for health & safety, GDPR, ISO standards, and custom compliance workflows. No
                  complex setup - just assign and track
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Audit-Ready Reports</CardTitle>
                <CardDescription>
                  Generate professional, timestamped reports that auditors love. Complete audit trail with submission
                  history and digital signatures
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Automated Tracking</CardTitle>
                <CardDescription>
                  Never miss a deadline again. Automated reminders, overdue alerts, and real-time compliance dashboards
                  keep your team on track
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Team Accountability</CardTitle>
                <CardDescription>
                  Clear task assignment with email notifications. Track who did what and when - perfect for
                  demonstrating due diligence
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Save 10+ Hours/Week</CardTitle>
                <CardDescription>
                  Eliminate manual checklists, spreadsheets, and chasing emails. Automated workflows that actually work
                  for small teams
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-accent mb-4" />
                <CardTitle>UK GDPR Compliant</CardTitle>
                <CardDescription>
                  Built with UK data protection standards in mind. Secure UK-based data storage with full GDPR
                  compliance and ICO-ready documentation
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-16">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                Coming Soon
              </Badge>
              <h3 className="text-2xl font-bold text-foreground mb-4">Premium Features</h3>
              <p className="text-muted-foreground">Advanced capabilities launching in the coming months</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative opacity-75">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">White Label Branding</CardTitle>
                  <CardDescription className="text-sm">
                    Complete white-label solution to brand the platform as your own and offer premium services
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="relative opacity-75">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <Shield className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">Enhanced Security Audit</CardTitle>
                  <CardDescription className="text-sm">
                    Advanced audit logging with risk assessment and anomaly detection for enhanced security compliance
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="relative opacity-75">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <BarChart3 className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">Automated Backups</CardTitle>
                  <CardDescription className="text-sm">
                    Automated backup systems with one-click recovery to protect your valuable compliance data
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="relative opacity-75">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <Users className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">External Sharing</CardTitle>
                  <CardDescription className="text-sm">
                    Share forms with contractors and external auditors without requiring full account access
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">SME-Friendly Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Enterprise-grade compliance features at small business prices - no hidden costs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="text-3xl font-bold">
                  £0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>Perfect for micro-businesses and startups</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />3 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Up to 5 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />1 Admin Account
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Basic reporting
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Manual Task Monitoring
                  </li>
                </ul>
                <Link href="/auth/sign-up" className="mt-auto">
                  <Button className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    🚀 Get Started FREE
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-accent border-2 shadow-xl flex flex-col">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1">
                Best for SMEs
              </Badge>
              <CardHeader>
                <CardTitle className="text-2xl">Growth</CardTitle>
                <div>
                  <Badge className="mb-2 bg-green-100 text-green-800 border-green-200">🎉 1 Month FREE Trial</Badge>
                  <div className="text-3xl font-bold">
                    £9.99<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Try free for 30 days, then £9.99/month</p>
                </div>
                <CardDescription>Ideal for growing small-medium businesses</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    10 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Up to 30 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Up to 3 Admin Accounts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Advanced Reporting
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Priority Email Support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="flex items-center">
                      🤖 AI Task Monitoring
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming Soon
                      </Badge>
                    </span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="flex items-center">
                      🔔 Smart Notifications
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming Soon
                      </Badge>
                    </span>
                  </li>
                </ul>
                <Link href="/auth/sign-up" className="mt-auto">
                  <Button className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Scale</CardTitle>
                <div>
                  <Badge className="mb-2 bg-green-100 text-green-800 border-green-200">🎉 1 Month FREE Trial</Badge>
                  <div className="text-3xl font-bold">
                    £19.99<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Try free for 30 days, then £19.99/month</p>
                </div>
                <CardDescription>For established SMEs ready to scale</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    30 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Up to 100 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Up to 10 Admin Accounts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Advanced Analytics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    Dedicated Account Manager
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="flex items-center">
                      🤖 Advanced AI Monitoring
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming Soon
                      </Badge>
                    </span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="flex items-center">
                      🔔 Predictive Notifications
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming Soon
                      </Badge>
                    </span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="flex items-center">
                      📊 AI Performance Insights
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming Soon
                      </Badge>
                    </span>
                  </li>
                </ul>
                <Link href="/auth/sign-up" className="mt-auto">
                  <Button className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Trusted by Growing SMEs</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Finally, enterprise-level task management that doesn't cost a fortune. MyDayLogs helped us streamline
                  operations without breaking our small business budget."
                </p>
                <div className="font-semibold">Sarah Johnson</div>
                <div className="text-sm text-muted-foreground">Founder, Local Marketing Agency (12 employees)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "The white-label feature lets us offer premium consulting services to our clients. We look like a big
                  consultancy but with SME agility and pricing."
                </p>
                <div className="font-semibold">Michael Chen</div>
                <div className="text-sm text-muted-foreground">Director, SME Business Solutions (8 employees)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Perfect for our growing manufacturing business. Easy compliance tracking without the complexity of
                  enterprise software. Our team of 25 loves how simple it is."
                </p>
                <div className="font-semibold">Emma Williams</div>
                <div className="text-sm text-muted-foreground">
                  Operations Manager, Precision Manufacturing (25 employees)
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />

      <CookieConsent />
    </div>
  )
}

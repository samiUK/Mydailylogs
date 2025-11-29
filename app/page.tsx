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
  Star,
  Menu,
  MessageSquare,
  ArrowRight,
  CheckSquare,
  FileText,
  Calendar,
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
    highPrice: "16", // Updated from 14.99 to 16 for monthly pricing
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
        price: "9", // Updated from 7.99 to 9 for monthly pricing
        priceCurrency: "GBP",
      },
      {
        "@type": "Offer",
        name: "Scale Plan",
        price: "16", // Updated from 14.99 to 16 for monthly pricing
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
    "Task management and reporting platform for SMEs. Streamline team coordination, track task completion, and generate professional reports with GDPR-compliant tools.",
  featureList: [
    "Custom Template Creation",
    "Task Assignment & Tracking",
    "Professional Reporting",
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
        <div className="max-w-7xl mx-auto text-center mb-12">
          <Badge variant="secondary" className="mb-6 text-sm font-semibold px-4 py-2">
            🎉 Beta 2.0 Now Live - Global Launch
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Professional Task Management <span className="text-accent block">& Reporting System for SMEs</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Professional task management with detailed reporting built specifically for small and medium enterprises.
            Streamline compliance tracking and team coordination with powerful automation tools.
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
                reports with timestamps, signatures, and complete task history for your business records.
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
                  Professional Reports for Your Business
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Generate professional compliance reports with your business branding, complete task history, and
                  timestamps. Suitable for documentation, record-keeping, and business reporting needs.
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
                      <strong className="text-foreground">Complete task history</strong> with timestamps and completion
                      details
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Optimized file sizes</strong> for easy storage and sharing
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Standard PDF format</strong> for compatibility
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
                      alt="Sample Professional Report - Task completion report with company letterhead, completion details, and timestamps"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Live example: Professional task completion report
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Core Features Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Digital Task Checklists</CardTitle>
                <CardDescription>
                  Create custom task templates and assign them to your team. Track completion status in real-time with
                  photo evidence and digital signatures.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Professional Reporting</CardTitle>
                <CardDescription>
                  Generate professional reports with your business branding, complete task history, and timestamps.
                  Perfect for documentation, record-keeping, and business reporting needs.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Multi-User Management</CardTitle>
                <CardDescription>
                  Manage your entire team from one dashboard. Assign tasks, track progress, and monitor completion rates
                  across all team members and departments.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Smart Scheduling & Reminders</CardTitle>
                <CardDescription>
                  Set up recurring tasks with customizable schedules. Automatic email reminders ensure nothing falls
                  through the cracks - perfect for regular compliance checks.
                </CardDescription>
              </CardHeader>
            </Card>
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
            {/* Starter Plan */}
            <Card className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription className="text-base">Perfect for micro-businesses and startups</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">Free</span>
                  <p className="text-sm text-muted-foreground mt-2">Forever free</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>1 admin account</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Up to 5 team members</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>3 task templates</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>50 report submissions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Manual task assignments</span>
                  </li>
                </ul>
                <Link href="/auth/sign-up" className="mt-auto">
                  <Button variant="outline" className="w-full h-12 text-lg font-semibold bg-transparent">
                    Get Started Free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Growth Plan */}
            <Card className="group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-2 border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Growth</CardTitle>
                <CardDescription className="text-base">Ideal for growing small-medium businesses</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">£9</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                  <p className="text-sm text-muted-foreground mt-2">or £8/month billed yearly (£96/year)</p>
                  <p className="text-sm font-semibold text-accent mt-1">First month free trial</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>3 admin accounts</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Up to 25 team members</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>10 task templates</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Unlimited report submissions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">⚡ Task Automation (Recurring Tasks)</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🎨 Custom Business Branding</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🔗 Contractor Link Share</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📸 Photo Upload on Reports</span>
                  </li>
                </ul>
                <Link href="/auth/sign-up" className="mt-auto">
                  <Button className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Scale Plan */}
            <Card className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Scale</CardTitle>
                <CardDescription className="text-base">For established SMEs ready to scale</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">£16</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                  <p className="text-sm text-muted-foreground mt-2">or £15/month billed yearly (£180/year)</p>
                  <p className="text-sm font-semibold text-accent mt-1">First month free trial</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>10 admin accounts</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Up to 75 team members</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>20 task templates</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Unlimited report submissions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">⚡ Task Automation (Recurring Tasks)</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🎨 Custom Business Branding</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🔗 Contractor Link Share</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📸 Photo Upload on Reports</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🔄 Report Deletion Recovery (via support)</span>
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
                  "Perfect for our growing manufacturing business. Easy compliance tracking without the complexity of
                  enterprise software. Our team of 25 loves how simple it is."
                </p>
                <div className="font-semibold">Emma Williams</div>
                <div className="text-sm text-muted-foreground">
                  Operations Manager, Precision Manufacturing (25 employees)
                </div>
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
                  "The business branding features let us add our company logo and name to all reports.
                  Professional-looking documentation that our clients love to see."
                </p>
                <div className="font-semibold">Michael Chen</div>
                <div className="text-sm text-muted-foreground">
                  Director, Facilities Management Company (40 employees)
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

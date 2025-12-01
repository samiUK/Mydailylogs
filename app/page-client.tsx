"use client"

import { createClient as createClientClient } from "@/lib/supabase/client"
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
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { CookieConsent } from "@/components/cookie-consent" // Declare the CookieConsent variable

export default function HomePageClient() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [currency, setCurrency] = useState<"GBP" | "USD">("GBP")
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true)

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/")
        if (response.ok) {
          const data = await response.json()
          const countryCode = data.country_code || "GB"
          setCurrency(countryCode === "GB" ? "GBP" : "USD")
        }
      } catch (error) {
        console.error("[v0] Currency detection failed:", error)
      } finally {
        setIsLoadingCurrency(false)
      }
    }

    detectCurrency()
  }, [])

  const handleUpgradeFromHomepage = async (planName: "growth" | "scale") => {
    setCheckingAuth(true)
    const supabase = createClientClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      router.push(`/admin/profile/billing?plan=${planName}`)
    } else {
      router.push(`/auth/sign-up?plan=${planName}`)
    }

    setCheckingAuth(false)
  }

  const checkUserAuth = async () => {
    const supabase = createClientClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (authUser) {
      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("id, role, organization_name")
        .eq("email", authUser.email)

      if (userProfiles && userProfiles.length > 0) {
        if (userProfiles.length > 1) {
          router.push("/profile")
        } else {
          const profile = userProfiles[0]

          if (profile.role === "admin") {
            router.push(`/admin`)
          } else if (profile.role === "staff") {
            router.push(`/staff`)
          } else {
            router.push(`/admin`)
          }
        }
      } else {
        router.push("/auth/login?error=no_profile_found")
      }
    }
  }

  const currentDate = new Date()
  const showBanner = true

  useEffect(() => {
    checkUserAuth()
  }, [])

  const formatPrice = (gbpPence: number) => {
    if (currency === "USD") {
      const usdPrice = gbpPence / 100 + 1
      return `$${usdPrice.toFixed(0)}`
    }
    return `£${(gbpPence / 100).toFixed(0)}`
  }

  const formatPriceDecimal = (gbpPence: number) => {
    if (currency === "USD") {
      const usdPrice = gbpPence / 100 + 1
      return `$${usdPrice.toFixed(2)}`
    }
    return `£${(gbpPence / 100).toFixed(2)}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
              <a href="#coming-soon" className="text-muted-foreground hover:text-foreground transition-colors">
                Coming Soon
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
                      <a
                        href="#coming-soon"
                        className="text-lg font-medium hover:text-accent transition-colors flex items-center"
                      >
                        Coming Soon
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

      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Task Management & Compliance <span className="text-accent block">for Growing Teams</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Professional task management and digital reporting for teams that work on-site, in the field, or at your
            premises. Complete checklists, capture evidence, and generate audit-ready reports from any device - perfect
            for construction, hospitality, healthcare, retail, logistics, and operations teams.
          </p>
        </div>
      </section>

      <section className="w-full">
        <img
          src="/images/mydaylogs-showcase.png"
          alt="MyDayLogs platform shown on laptop and mobile - Admin dashboard on desktop and mobile checklist interface demonstrating mobile-friendly field team capabilities"
          className="w-full h-auto object-cover"
        />
      </section>

      <section className="py-20 bg-muted/30" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Digital Checklists</CardTitle>
                <CardDescription>
                  Create custom task templates for your team. Complete them on any device - mobile, tablet, or desktop.
                  Track completion status in real-time with photo evidence and timestamps for compliance documentation.
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
                  Generate branded reports with your company logo. Complete task history, photos, and timestamps
                  submitted from anywhere - perfect for audit-ready compliance records and professional client
                  documentation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage your entire team from one dashboard. Assign tasks to staff, track progress in real-time, and
                  monitor completion rates across all team members and locations - office or field-based.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Smart Automation</CardTitle>
                <CardDescription>
                  Set up recurring tasks (daily/weekly/monthly) or schedule for specific dates. Automatic email
                  reminders ensure your team never misses critical compliance checks, safety inspections, or operational
                  tasks.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Professional features at prices that work for growing businesses
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription className="text-base">Perfect for micro-businesses testing the waters</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">Free</span>
                  <p className="text-sm text-muted-foreground mt-2">Forever free - no credit card required</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>1 Admin/Manager</span>
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
                    <span>50 reports/month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>30-day report storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Manual task assignments</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>Multi-day scheduling (30 days max)</span>
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
                <Badge className="w-fit mb-2 bg-accent text-accent-foreground">Most Popular</Badge>
                <CardTitle className="text-2xl">Growth</CardTitle>
                <CardDescription className="text-base">Ideal for growing small-medium businesses</CardDescription>
                <div className="mt-4">
                  {isLoadingCurrency ? (
                    <span className="text-5xl font-bold text-muted-foreground">...</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-foreground">{formatPrice(900)}</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                      <p className="text-sm text-muted-foreground mt-2">
                        or {formatPrice(800)}/month billed yearly ({currency === "USD" ? "$108" : formatPrice(9600)}
                        /year)
                      </p>
                    </>
                  )}
                  <p className="text-sm font-semibold text-accent mt-1">First month free trial</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>3 Admin/Managers</span>
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
                    <span>90-day report storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">⚡ Recurring Task Automation</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📅 Unlimited Multi-Day Scheduling</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🎨 Custom Business Branding</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📧 Email Notifications</span>
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
                    <span className="font-semibold">🕐 Business Hours Integration</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgradeFromHomepage("growth")}
                  disabled={checkingAuth}
                  className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  {checkingAuth ? "Loading..." : "Get Started"}
                </Button>
              </CardContent>
            </Card>

            {/* Scale Plan */}
            <Card className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Scale</CardTitle>
                <CardDescription className="text-base">
                  For established businesses ready to scale operations
                </CardDescription>
                <div className="mt-4">
                  {isLoadingCurrency ? (
                    <span className="text-5xl font-bold text-muted-foreground">...</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-foreground">{formatPrice(1600)}</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                      <p className="text-sm text-muted-foreground mt-2">
                        or {formatPrice(1500)}/month billed yearly ({currency === "USD" ? "$192" : formatPrice(18000)}
                        /year)
                      </p>
                    </>
                  )}
                  <p className="text-sm font-semibold text-accent mt-1">First month free trial</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span>7 Admin/Managers</span>
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
                    <span>90-day report storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">⚡ Recurring Task Automation</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📅 Unlimited Multi-Day Scheduling</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🎨 Custom Business Branding</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">📧 Email Notifications</span>
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
                    <span className="font-semibold">🕐 Business Hours Integration</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                    <span className="font-semibold">🔄 Report Recovery (via support)</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgradeFromHomepage("scale")}
                  disabled={checkingAuth}
                  className="w-full h-12 text-lg font-semibold"
                >
                  {checkingAuth ? "Loading..." : "Get Started"}
                </Button>
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

      <section id="coming-soon" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Coming Soon</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Exciting new features are on the way to make MyDayLogs even more powerful for your business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-muted hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">MyDayLogs Mobile App</h3>
                <p className="text-muted-foreground text-sm">
                  Native iOS and Android apps for on-the-go task management. Complete checklists, capture photos, and
                  submit reports from anywhere.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-muted hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Custom Pricing Plans</h3>
                <p className="text-muted-foreground text-sm">
                  Enterprise solutions tailored to your organization. Custom admin limits, advanced features, and
                  flexible billing options for larger teams.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-muted hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Dedicated Support</h3>
                <p className="text-muted-foreground text-sm">
                  Priority email and phone support with dedicated account management. Get personalized onboarding and
                  training for your team.
                </p>
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

import { createClient } from "@/lib/supabase/server"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CheckCircle, Shield, BarChart3, Users, Clock, FileText, Star, Menu, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { FeedbackModal } from "@/components/feedback-modal"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Landing page - User object:", user ? { id: user.id, email: user.email } : null)
  console.log("[v0] Landing page - User exists:", !!user)

  if (user) {
    // Fetch user profile to determine role
    const { data: profile } = await supabase.from("profiles").select("role").eq("email", user.email).single()

    console.log("[v0] Landing page - User profile:", profile)

    // Redirect based on role
    if (profile?.role === "admin") {
      redirect("/admin")
    } else if (profile?.role === "staff") {
      redirect("/staff")
    } else {
      // Default redirect to admin if no specific role found
      redirect("/admin")
    }
  }

  const currentDate = new Date()
  const showBanner = true // Always show banner during beta period

  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Task Management
            <span className="text-accent block">& Team Reporting</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Cost-effective white-label solution designed specifically for SMEs. Streamline operations, ensure
            compliance, and manage teams without breaking the budget. Perfect for businesses with 5-100 employees
            looking for enterprise-grade functionality at SME-friendly prices.
          </p>
        </div>
      </section>

      <section className="w-full">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SS%20on%20a%20laptop-VtYtlb8qyBsDDNBhFuxxDfROzNmFTw.png"
          alt="MyDayLogs Admin Dashboard"
          className="w-full h-auto object-cover"
        />
      </section>

      <section className="py-20">
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for Small-Medium Enterprises</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything your growing business needs without the enterprise complexity or cost
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Simple Task Management</CardTitle>
                <CardDescription>
                  No complex setup required. Create and manage tasks with templates designed for small business
                  workflows
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Affordable Compliance</CardTitle>
                <CardDescription>
                  Meet regulatory requirements without expensive consultants. Automated tracking that fits your budget
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Professional Reports</CardTitle>
                <CardDescription>
                  Impress clients and stakeholders with branded reports that look like they came from a big consultancy
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Keep your small team aligned and productive with simple task assignment and progress tracking
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Time-Saving Automation</CardTitle>
                <CardDescription>
                  Reduce manual work with automated scheduling and reminders - perfect for lean teams
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
                  <CardTitle className="text-lg">Security Audit</CardTitle>
                  <CardDescription className="text-sm">
                    Comprehensive security auditing with detailed logs and compliance tracking for enterprise-grade
                    protection
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
                  <CardTitle className="text-lg">Backup & Data Recovery</CardTitle>
                  <CardDescription className="text-sm">
                    Automated backup systems with one-click recovery to protect your valuable business data
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
              Enterprise features at small business prices - no hidden costs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="text-3xl font-bold">
                  £0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>Perfect for micro-businesses and startups</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />3 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Up to 5 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Basic reporting
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-transparent" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-accent">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent">Best for SMEs</Badge>
              <CardHeader>
                <CardTitle className="text-2xl">Growth</CardTitle>
                <div className="text-3xl font-bold">
                  £19<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>Ideal for growing small-medium businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    10 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Up to 30 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Advanced Reporting
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Priority Email Support
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-accent hover:bg-accent/90">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Scale</CardTitle>
                <div className="text-3xl font-bold">
                  £39<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>For established SMEs ready to scale</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    30 Templates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Up to 100 Team Members
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Advanced Analytics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Dedicated Account Manager
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-transparent" variant="outline">
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
    </div>
  )
}

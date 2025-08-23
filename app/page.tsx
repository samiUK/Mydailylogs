import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MydailylogsLogo } from "@/components/mydailylogs-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CheckCircle, Shield, BarChart3, Users, Clock, FileText, Star, Menu } from "lucide-react"
import Link from "next/link"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MydailylogsLogo size="md" />
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
                      <MydailylogsLogo size="sm" />
                    </div>

                    {/* Navigation Links */}
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

                    {/* CTA Buttons - More prominent */}
                    <div className="mt-auto mb-6">
                      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                        <div className="text-center mb-4">
                          <h3 className="font-semibold text-foreground mb-2">Ready to get started?</h3>
                          <p className="text-sm text-muted-foreground">
                            Join thousands of businesses streamlining compliance
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

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Your Business
            <span className="text-accent block">Compliance & Reporting</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            White-label compliance checklist platform designed for SMBs. Ensure regulatory compliance, track team
            performance, and generate professional reports with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started with compliance management in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Create Templates</h3>
              <p className="text-muted-foreground">
                Set up customizable compliance checklists and templates tailored to your business needs. Define tasks,
                schedules, and requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Assign & Track</h3>
              <p className="text-muted-foreground">
                Assign tasks to team members with automated scheduling. Monitor progress in real-time and receive
                notifications for missed deadlines.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-accent-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Generate Reports</h3>
              <p className="text-muted-foreground">
                Create professional compliance reports with your branding. Export to PDF and share with stakeholders or
                regulatory bodies.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need for Compliance</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to manage compliance, track progress, and generate reports
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Compliance Management</CardTitle>
                <CardDescription>Create and manage compliance checklists with customizable templates</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Advanced Reporting</CardTitle>
                <CardDescription>Generate professional reports with your branding and export to PDF</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Assign tasks, track progress, and manage team members efficiently</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Automated Scheduling</CardTitle>
                <CardDescription>
                  Set up daily, weekly, monthly, or custom schedules for compliance tasks
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="w-10 h-10 text-accent mb-4" />
                <CardTitle>White-Label Solution</CardTitle>
                <CardDescription>Customize with your branding and present as your own platform</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-accent mb-4" />
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>Monitor compliance status and get instant notifications</CardDescription>
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
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="relative opacity-75">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <Shield className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">Compliance Analytics</CardTitle>
                  <CardDescription className="text-sm">
                    Advanced compliance reporting with trend analysis and risk assessment
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
                  <CardTitle className="text-lg">Template Analytics</CardTitle>
                  <CardDescription className="text-sm">
                    Deep insights into template performance and completion rates
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
                  <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-lg">Custom Reports</CardTitle>
                  <CardDescription className="text-sm">
                    Build custom report templates with advanced filtering and formatting
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your business needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="text-3xl font-bold">
                  £0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>Perfect for small teams getting started</CardDescription>
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
                    Basic reporting with no branding
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
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent">Most Popular</Badge>
              <CardHeader>
                <CardTitle className="text-2xl">Base</CardTitle>
                <div className="text-3xl font-bold">
                  £19<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>Ideal for growing businesses</CardDescription>
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
                    Custom Branding
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-accent mr-2" />
                    Email Support
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-accent hover:bg-accent/90">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-3xl font-bold">
                  £39<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <CardDescription>For large teams and enterprises</CardDescription>
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
                    Priority Support
                  </li>
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-transparent" variant="outline">
                    Start Free Trial
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Trusted by Business Leaders</h2>
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
                  "Mydailylogs has transformed how we handle compliance. The automated reporting saves us hours every
                  week."
                </p>
                <div className="font-semibold">Sarah Johnson</div>
                <div className="text-sm text-muted-foreground">Operations Manager, TechCorp</div>
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
                  "The white-label solution is perfect for our consulting business. Our clients love the professional
                  reports."
                </p>
                <div className="font-semibold">Michael Chen</div>
                <div className="text-sm text-muted-foreground">CEO, Compliance Solutions Ltd</div>
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
                  "Easy to use, comprehensive features, and excellent support. Exactly what our growing team needed."
                </p>
                <div className="font-semibold">Emma Williams</div>
                <div className="text-sm text-muted-foreground">Quality Manager, Manufacturing Plus</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="bg-sidebar border-t border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <MydailylogsLogo size="md" />
              <p className="text-sidebar-foreground/70 mt-4">
                Professional compliance and reporting platform for modern businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#features" className="hover:text-sidebar-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-sidebar-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    GDPR
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-sidebar-border mt-8 pt-8 text-center text-sidebar-foreground/70">
            <p>&copy; 2025 Mydailylogs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

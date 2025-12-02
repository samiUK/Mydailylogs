import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, Building2, Utensils, Hammer, Heart, ShoppingBag, Truck } from "lucide-react"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"

export const metadata: Metadata = {
  title: "Use Cases - Mobile Task Management & Compliance for Field Teams | MyDayLogs",
  description:
    "Discover how MyDayLogs helps field teams across construction, hospitality, healthcare, retail, and logistics streamline compliance tracking with mobile-first task management and audit-ready reporting.",
  keywords:
    "mobile task management, field operations software, compliance tracking, construction safety checklists, restaurant compliance, healthcare reporting, retail operations, logistics management, mobile reporting app, audit-ready reports, field team compliance",
  openGraph: {
    title: "Use Cases - Mobile Task Management & Compliance for Field Teams",
    description:
      "See how MyDayLogs empowers on-the-go teams with mobile compliance tracking and professional reporting across multiple industries.",
    type: "website",
  },
}

const useCases = [
  {
    icon: Hammer,
    industry: "Construction & Trades",
    title: "On-Site Safety & Compliance Tracking",
    description:
      "Empower your construction crews and trade workers to complete daily safety checks, equipment inspections, and site reports directly from their mobile devices on the job site.",
    challenges: [
      "Paper-based safety checklists getting lost or damaged on site",
      "Delayed reporting of safety incidents and equipment issues",
      "Difficulty proving compliance during safety audits",
      "Supervisors unable to track task completion across multiple sites",
    ],
    solutions: [
      "Mobile-first digital checklists accessible offline on construction sites",
      "Photo documentation of safety issues and equipment conditions",
      "Automated daily task assignments for opening and closing site inspections",
      "Audit-ready PDF reports with timestamps for regulatory compliance",
      "Real-time visibility of completed vs pending safety checks across all sites",
    ],
    results:
      "Construction managers report 70% faster safety reporting and significantly improved audit readiness with digital compliance trails.",
    color: "orange",
  },
  {
    icon: Building2,
    industry: "Sales Teams & Field Reps",
    title: "Client Visit Tracking & Follow-up Management",
    description:
      "Enable sales representatives and account managers to log client visits, track interactions, and manage follow-up tasks on mobile devices throughout their sales territory.",
    challenges: [
      "Client visit logs lost or incomplete, affecting relationship management",
      "Missed follow-up opportunities due to poor task tracking",
      "Territory managers unable to verify rep activity and coverage",
      "Difficulty demonstrating client engagement for compliance and commissions",
    ],
    solutions: [
      "Mobile visit logs with client details and meeting outcomes",
      "Photo documentation of product displays and client facilities",
      "Automated follow-up task creation with deadline reminders",
      "Territory-wide visibility for regional sales managers",
      "Professional visit reports for client records and internal audits",
    ],
    results:
      "Sales teams increase follow-up completion rates by 65% and improve client relationship documentation for better account management.",
    color: "blue",
  },
  {
    icon: Hammer,
    industry: "Surveyors & Property Assessors",
    title: "Site Inspection & Property Assessment",
    description:
      "Support surveyors and property assessors with mobile tools to complete site inspections, property assessments, and condition reports with photo evidence directly from the field.",
    challenges: [
      "Paper-based survey reports prone to errors and delays",
      "Difficulty capturing and organizing site photos during inspections",
      "Inconsistent reporting formats across different surveyors",
      "Clients waiting days for survey reports to be typed up",
    ],
    solutions: [
      "Customizable inspection checklists for different property types",
      "Photo upload with annotations for defect documentation",
      "Location-based reporting for site visit verification",
      "Professional PDF reports generated immediately after inspection",
      "Template library for residential, commercial, and land surveys",
    ],
    results:
      "Surveying firms reduce report turnaround time by 80% and deliver consistent, professional documentation to clients same-day.",
    color: "green",
  },
  {
    icon: Utensils,
    industry: "Hospitality & Food Service",
    title: "Food Safety & Operations Management",
    description:
      "Enable restaurant and hotel staff to complete food safety checks, opening/closing checklists, and hygiene inspections on mobile devices throughout their shifts.",
    challenges: [
      "Food safety logs completed inconsistently or at end of shift",
      "Temperature checks and cleaning schedules not documented properly",
      "Failed health inspections due to missing compliance records",
      "Multiple location managers struggling to enforce standards",
    ],
    solutions: [
      "Daily and shift-based task automation for food safety protocols",
      "Mobile temperature logging with photo evidence of refrigeration units",
      "Recurring checklists for opening, closing, and cleaning procedures",
      "Centralized reporting for multi-location restaurant groups",
      "Business hours integration to skip tasks when locations are closed",
    ],
    results:
      "Hospitality businesses achieve 100% food safety compliance with timestamped digital records that satisfy health department audits.",
    color: "red",
  },
  {
    icon: Utensils,
    industry: "Commercial Kitchens & Catering",
    title: "Kitchen Compliance & Hygiene Tracking",
    description:
      "Equip commercial kitchen staff and catering teams with mobile hygiene logs, equipment checks, and food prep documentation required for health and safety compliance.",
    challenges: [
      "HACCP records not maintained consistently during busy service periods",
      "Equipment temperature monitoring skipped or recorded incorrectly",
      "Health inspector violations due to incomplete documentation",
      "Catering managers unable to verify food safety at off-site events",
    ],
    solutions: [
      "Automated HACCP checklists for critical control point monitoring",
      "Shift-based cleaning schedules with photo evidence completion",
      "Equipment maintenance logs for fridges, freezers, and cooking equipment",
      "Mobile reporting for off-site catering and event locations",
      "Allergen tracking and cross-contamination prevention checklists",
    ],
    results:
      "Commercial kitchens maintain continuous health and safety compliance with complete digital records that pass environmental health inspections.",
    color: "red",
  },
  {
    icon: Heart,
    industry: "Healthcare & Care Homes",
    title: "Patient Care & Facility Compliance",
    description:
      "Support healthcare workers and care home staff with mobile care logs, medication rounds tracking, and facility inspection checklists accessible at point of care.",
    challenges: [
      "Care logs and medication administration records on paper prone to errors",
      "Facility inspection checklists incomplete or falsified",
      "Difficulty tracking staff completion of mandatory care tasks",
      "Care Quality Commission (CQC) audits requiring extensive documentation",
    ],
    solutions: [
      "Secure mobile reporting for patient observations and care activities",
      "Scheduled medication round reminders with completion tracking",
      "Photo documentation of facility conditions and care environments",
      "Weekly and monthly facility inspection automation",
      "Professional reports demonstrating duty of care for CQC compliance",
    ],
    results:
      "Care providers reduce compliance documentation time by 60% while improving accuracy and audit-readiness of care records.",
    color: "pink",
  },
  {
    icon: ShoppingBag,
    industry: "Retail & Merchandising",
    title: "Store Operations & Visual Merchandising",
    description:
      "Equip retail teams and field merchandisers with mobile tools to complete store opening checks, stockroom inspections, and visual merchandising standards across multiple locations.",
    challenges: [
      "Inconsistent execution of store opening and closing procedures",
      "Visual merchandising standards not maintained across locations",
      "Area managers unable to verify task completion remotely",
      "Loss prevention issues due to incomplete cash handling logs",
    ],
    solutions: [
      "Automated daily checklists for store opening, closing, and cash handling",
      "Photo-based merchandising reports submitted from store floor",
      "Multi-location visibility for regional and area managers",
      "Contractor link sharing for external merchandising teams",
      "Holiday scheduling to pause tasks during store closures",
    ],
    results:
      "Retail chains improve operational consistency across stores by 85% with standardized digital reporting and real-time task visibility.",
    color: "purple",
  },
  {
    icon: Truck,
    industry: "Logistics & Field Services",
    title: "Fleet & Equipment Management",
    description:
      "Enable drivers and field technicians to complete vehicle inspections, equipment checks, and service visit reports on mobile devices before, during, and after jobs.",
    challenges: [
      "Drivers skipping daily vehicle safety checks (walk-around inspections)",
      "Service engineers unable to document work completed at customer sites",
      "Fleet managers lacking visibility of vehicle condition and maintenance needs",
      "Compliance failures during DVSA (Driver and Vehicle Standards Agency) inspections",
    ],
    solutions: [
      "Mandatory daily vehicle inspection checklists for drivers",
      "Mobile service reports with photo evidence from customer sites",
      "Recurring weekly and monthly equipment maintenance logs",
      "Automated email reminders for overdue safety checks",
      "Comprehensive audit trail for fleet compliance and insurance claims",
    ],
    results:
      "Logistics companies achieve 95% completion rate on daily vehicle checks and maintain DVSA compliance with digital inspection records.",
    color: "blue",
  },
  {
    icon: Building2,
    industry: "Facilities Management",
    title: "Property & Maintenance Operations",
    description:
      "Support facilities teams managing multiple buildings with mobile checklists for routine inspections, maintenance logs, and contractor oversight across their property portfolio.",
    challenges: [
      "Reactive maintenance due to missed routine inspections",
      "Difficulty tracking contractor work and compliance across sites",
      "Paper-based logbooks lost or incomplete for building audits",
      "Facilities managers unable to prove maintenance schedules were followed",
    ],
    solutions: [
      "Scheduled weekly and monthly building inspection automation",
      "Shareable checklists for external contractors via public links",
      "Photo documentation of maintenance issues and completed work",
      "Multi-site reporting dashboard for property portfolio managers",
      "Custom task templates for HVAC, fire safety, and statutory compliance",
    ],
    results:
      "Facilities managers reduce emergency callouts by 40% through improved preventive maintenance tracking and compliance documentation.",
    color: "green",
  },
]

const commonFeatures = [
  "Mobile-first reporting accessible on any smartphone or tablet",
  "Offline capability for field locations with poor connectivity",
  "Photo upload for visual evidence and documentation",
  "Automated recurring task assignments (daily, weekdays, weekly, monthly)",
  "Professional PDF reports with timestamps and digital signatures",
  "Multi-user team management with admin oversight",
  "Business hours scheduling to align with operating times",
  "Audit-ready compliance trails for inspections and certifications",
]

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/">
            <MyDayLogsLogo size="md" />
          </Link>
          <nav className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost">Contact</Button>
            </Link>
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Hero Section */}
        <section className="py-12 border-b">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm font-semibold px-4 py-2">
              Mobile Task Management for Field Teams
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Built for Teams Across <span className="text-accent">All Industries</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              MyDayLogs empowers teams working on-site, in the field, or at your business premises to capture compliance
              data, complete operational checks, and submit professional reports from any device - mobile, tablet, or
              desktop.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Proven Solutions Across Industries
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See how teams in different sectors use MyDayLogs to streamline operations, improve compliance, and
                maintain audit-ready documentation - whether working remotely, on-site, or in-office.
              </p>
            </div>

            <div className="space-y-16">
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon
                return (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/50">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-${useCase.color}-500/10`}>
                          <Icon className={`h-8 w-8 text-${useCase.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-2xl mb-2">{useCase.industry}</CardTitle>
                          <CardDescription className="text-base">{useCase.title}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground mb-6 text-lg">{useCase.description}</p>

                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="text-red-500">⚠</span> Common Challenges
                          </h4>
                          <ul className="space-y-2">
                            {useCase.challenges.map((challenge, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{challenge}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            MyDayLogs Solutions
                          </h4>
                          <ul className="space-y-2">
                            {useCase.solutions.map((solution, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-foreground">
                          <span className="text-accent font-semibold">Results: </span>
                          {useCase.results}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Common Features Section */}
        <section className="py-20 bg-muted/30 border-y -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Core Features for Every Industry</h2>
              <p className="text-lg text-muted-foreground">
                All MyDayLogs plans include essential mobile compliance tools
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {commonFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 bg-background p-4 rounded-lg border">
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Streamline Your Field Operations?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join teams across multiple industries who trust MyDayLogs for mobile task management and compliance
              reporting. Start with our free plan - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Affordable flat-rate pricing from just £9/month for up to 25 team members
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

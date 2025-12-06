import type { Metadata } from "next"
import HomePageClient from "./page-client"

export const metadata: Metadata = {
  title: "MyDayLogs - Simple Task Management & Compliance Reporting for Growing Businesses",
  description:
    "Professional task management and compliance reporting built for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate professional reports - perfect for construction, hospitality, healthcare, retail, logistics, facilities management, and service industries.",
  keywords:
    "task management software, compliance reporting, team coordination, digital reporting, field operations, mobile checklists, recurring tasks, business automation, manager tools, team management app, compliance tracking, construction management, hospitality operations, healthcare coordination, retail management, logistics tracking, facilities management, service industries",
  openGraph: {
    title: "MyDayLogs - Simple Task Management & Compliance Reporting",
    description:
      "Professional task management and compliance reporting for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate professional reports instantly.",
    images: ["/og-image.png"],
  },
}

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
    highPrice: "16",
    offerCount: "3",
    offers: [
      {
        "@type": "Offer",
        name: "Starter Plan",
        price: "0",
        priceCurrency: "GBP",
        description: "Free forever - 1 manager, up to 5 team members",
      },
      {
        "@type": "Offer",
        name: "Growth Plan",
        price: "9",
        priceCurrency: "GBP",
        description: "3 managers, up to 25 team members",
      },
      {
        "@type": "Offer",
        name: "Scale Plan",
        price: "16",
        priceCurrency: "GBP",
        description: "7 managers, up to 75 team members",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
  },
  description:
    "Professional task management and compliance reporting built for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate professional reports - perfect for construction, hospitality, healthcare, retail, logistics, facilities management, and service industries worldwide.",
  featureList: [
    "Automated Recurring Tasks",
    "Multi-Manager Coordination",
    "Custom Task Templates",
    "Mobile Checklists & Reporting",
    "Professional PDF Reports",
    "Team Management Dashboard",
    "Email Notifications",
    "Photo Upload on Reports",
    "30-day Report Storage",
    "Contractor Link Sharing",
  ],
  screenshot: "https://www.mydaylogs.co.uk/og-image.png",
  softwareVersion: "2.0",
  releaseNotes: "Beta 2.0 - Manager roles and enhanced team coordination",
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient />
    </>
  )
}

import type { Metadata } from "next"
import HomePageClient from "./page-client"

export const metadata: Metadata = {
  title: "MyDayLogs - Task Management & Digital Reporting for Growing Teams Worldwide",
  description:
    "Streamline your team operations with digital task management and professional reporting. Perfect for businesses worldwide with 1-7 managers coordinating field teams. Automated recurring tasks, mobile checklists, and instant reports. Free forever plan available.",
  keywords:
    "task management software, team coordination, digital reporting, field operations, mobile checklists, recurring tasks, business automation, manager tools, team management app, compliance tracking, construction management, hospitality operations, healthcare coordination, retail management, logistics tracking, SME software, small business tools",
  openGraph: {
    title: "MyDayLogs - Task Management for Growing Teams Worldwide",
    description:
      "Professional task management and digital reporting for businesses worldwide. Support 1-7 managers with automated tasks, mobile checklists, and instant reports. Free plan available.",
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
    "Task management and digital reporting platform for growing teams worldwide. Automate recurring tasks, coordinate 1-7 managers, complete mobile checklists, and generate professional reports instantly. Perfect for construction, hospitality, healthcare, retail, and logistics operations.",
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
  releaseNotes: "Beta 2.0 - Manager roles and global operations support",
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient />
    </>
  )
}

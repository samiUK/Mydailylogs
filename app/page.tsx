import type { Metadata } from "next"
import HomePageClient from "./page-client"

export const metadata: Metadata = {
  title: "MyDayLogs - Mobile-Friendly Task Management & Reporting for Field Teams | UK SME Solution",
  description:
    "Mobile-friendly task management and compliance reporting for field teams. Perfect for construction, hospitality, healthcare, retail, and logistics teams who need to track tasks, complete checklists, and generate professional reports on mobile devices. Starting at £9/month for UK SMEs.",
  keywords:
    "mobile task management, field team software, mobile compliance tracking, on-the-go reporting, mobile checklists, field operations app, mobile-friendly task app, construction mobile app, retail field operations, hospitality compliance, healthcare mobile reporting, logistics tracking app, UK task management, SME software UK",
  openGraph: {
    title: "MyDayLogs - Mobile-Friendly Task Management for Field Teams",
    description:
      "Professional task management and compliance reporting on mobile devices for UK field teams. Affordable flat-rate pricing starting at £9/month.",
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
      },
      {
        "@type": "Offer",
        name: "Growth Plan",
        price: "9",
        priceCurrency: "GBP",
      },
      {
        "@type": "Offer",
        name: "Scale Plan",
        price: "16",
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
    "Mobile-friendly task management and reporting platform for field teams. Streamline compliance tracking, complete checklists on mobile devices, and generate professional reports from anywhere. Perfect for construction, hospitality, healthcare, retail, and logistics operations.",
  featureList: [
    "Mobile-Friendly Task Management",
    "Field Team Coordination",
    "Custom Template Creation",
    "Mobile Checklists & Reporting",
    "Professional PDF Reports",
    "GDPR Compliance",
    "Team Management",
    "Automated Email Notifications",
    "Progress Monitoring",
  ],
  screenshot: "https://www.mydaylogs.co.uk/og-image.png",
  softwareVersion: "2.0",
  releaseNotes: "Beta 2.0 - Enhanced mobile experience and field team features",
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient />
    </>
  )
}

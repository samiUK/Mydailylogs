import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { BrandingProvider } from "@/components/branding-provider"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mydaylogs.co.uk"),
  title: {
    default: "MyDayLogs - Simple Task Management & Compliance Reporting for Growing Businesses",
    template: "%s | MyDayLogs",
  },
  description:
    "Professional task management and compliance reporting built for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate professional reports - perfect for construction, hospitality, healthcare, retail, logistics, facilities management, and service industries worldwide.",
  keywords: [
    "task management software",
    "compliance reporting",
    "team coordination",
    "digital reporting",
    "manager tools",
    "automated recurring tasks",
    "business operations software",
    "field team management",
    "mobile checklists",
    "team productivity",
    "small business software",
    "compliance tracking",
    "report automation",
    "construction management",
    "hospitality operations",
    "healthcare coordination",
    "retail management",
    "logistics tracking",
  ],
  authors: [{ name: "MyDayLogs" }],
  creator: "MyDayLogs",
  publisher: "MyDayLogs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.mydaylogs.co.uk",
    siteName: "MyDayLogs",
    title: "MyDayLogs - Simple Task Management & Compliance Reporting for Growing Businesses",
    description:
      "Professional task management and compliance reporting for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate professional reports instantly.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyDayLogs - Task Management & Compliance Reporting Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDayLogs - Simple Task Management & Compliance Reporting",
    description:
      "Professional task management built for teams working on-site, in the office, or on the go. Complete checklists, capture evidence, and generate reports instantly.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://www.mydaylogs.co.uk",
  },
  category: "Business Software",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  console.log("[v0] RootLayout rendering")

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="canonical" href="https://www.mydaylogs.co.uk" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MyDayLogs" />
        <meta name="theme-color" content="#059669" />
      </head>
      <body className="font-sans antialiased">
        <BrandingProvider>{children}</BrandingProvider>
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  )
}

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { BrandingProvider } from "@/components/branding-provider"

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
    default: "MyDayLogs - Mobile-First Compliance for Field Teams | Beta 2.0",
    template: "%s | MyDayLogs",
  },
  description:
    "Mobile-first compliance task management for field teams and mobile workers. Complete checklists, capture photos, and generate reports from any device. Perfect for construction, hospitality, healthcare, and logistics teams on the go.",
  keywords: [
    "compliance management software",
    "task management UK",
    "audit reporting tool",
    "GDPR compliance software",
    "SME task management",
    "business compliance tracking",
    "team task assignment",
    "compliance checklist software",
    "UK business productivity",
    "regulatory compliance tool",
    "audit-ready reports",
    "compliance automation",
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
    locale: "en_GB",
    url: "https://www.mydaylogs.co.uk",
    siteName: "MyDayLogs",
    title: "MyDayLogs - Mobile-First Compliance for Field Teams",
    description:
      "Complete compliance tasks from anywhere. Mobile-optimized for field teams with offline-ready checklists, photo capture, and instant reporting.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyDayLogs - Compliance Task Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDayLogs - Mobile-First Compliance for Field Teams",
    description:
      "Complete compliance tasks from anywhere. Mobile-optimized for field teams with photo capture and instant reporting.",
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
  return (
    <html lang="en-GB" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
      </body>
    </html>
  )
}

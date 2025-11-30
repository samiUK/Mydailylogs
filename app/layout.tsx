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
    default: "MyDayLogs - Task Management for Growing Teams | Beta 2.0",
    template: "%s | MyDayLogs",
  },
  description:
    "Streamline team operations with automated task management and digital reporting. Support 1-7 managers coordinating field teams worldwide. Complete checklists, capture photos, and generate reports from any device. Free forever plan available.",
  keywords: [
    "task management software",
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
    title: "MyDayLogs - Task Management for Growing Teams",
    description:
      "Automate recurring tasks and coordinate 1-7 managers with mobile checklists, photo capture, and instant reporting. Free plan available.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyDayLogs - Task Management & Digital Reporting Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDayLogs - Task Management for Growing Teams",
    description:
      "Automate recurring tasks and coordinate teams with mobile checklists, photo capture, and instant reporting. Free forever plan.",
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
      </body>
    </html>
  )
}

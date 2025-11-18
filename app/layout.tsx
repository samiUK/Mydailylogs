import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import "./globals.css"
import { BrandingProvider } from "@/components/branding-provider"

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: "MyDayLogs",
  description: "Professional compliance checklist platform for businesses",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <BrandingProvider>{children}</BrandingProvider>
      </body>
    </html>
  )
}

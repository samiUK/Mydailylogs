import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing Plans - MyDayLogs",
  description:
    "Choose the perfect compliance management plan for your UK business. Free Starter plan with 5 team members, or upgrade to Growth and Scale plans for larger teams. 1-month free trial available.",
  openGraph: {
    title: "Pricing Plans - MyDayLogs",
    description: "Affordable compliance management for UK SMEs. Start free with up to 5 team members.",
    url: "https://www.mydaylogs.co.uk/pricing",
  },
  alternates: {
    canonical: "https://www.mydaylogs.co.uk/pricing",
  },
}

const PricingPage = () => {
  // ... existing code here ...
  return <div>{/* Pricing page content goes here */}</div>
}

export default PricingPage

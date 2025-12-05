import "server-only"

import Stripe from "stripe"

const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_MYDAYLOGS

if (!stripeKey) {
  throw new Error(
    "Stripe API key not found. Please set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_MYDAYLOGS environment variable.",
  )
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
})

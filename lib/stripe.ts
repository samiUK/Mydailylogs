import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

export const getStripeCustomerByEmail = async (email: string) => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })
  return customers.data[0] || null
}

export const createStripeCustomer = async (email: string, name: string) => {
  return await stripe.customers.create({
    email,
    name,
  })
}

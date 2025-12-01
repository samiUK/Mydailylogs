import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Stripe automatically converts trials to paid subscriptions
    // No manual intervention needed
    return NextResponse.json({
      success: true,
      message: "Trial conversion is handled automatically by Stripe",
    })
  } catch (error) {
    console.error("Error in expire-trials cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

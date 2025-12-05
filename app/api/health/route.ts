// Health check endpoint for monitoring
import { NextResponse } from "next/server"
import { runProductionHealthCheck } from "@/lib/production-health-check"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: Request) {
  try {
    // Optional: Add authentication for production
    const authHeader = request.headers.get("authorization")
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.HEALTH_CHECK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const healthCheck = await runProductionHealthCheck()

    const statusCode = healthCheck.status === "healthy" ? 200 : healthCheck.status === "degraded" ? 500 : 503

    return NextResponse.json(healthCheck, { status: statusCode })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}

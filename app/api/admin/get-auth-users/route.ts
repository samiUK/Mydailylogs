import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    console.log("[v0] Fetching auth users for verification status...")
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("[v0] Error fetching auth users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[v0] Successfully fetched ${data.users.length} auth users`)

    // Return verification data including last sign in timestamp
    const verificationMap = data.users.reduce(
      (acc, user) => {
        acc[user.id] = {
          email_confirmed_at: user.email_confirmed_at,
          email: user.email,
          last_sign_in_at: user.last_sign_in_at || null,
          created_at: user.created_at || null,
        }
        return acc
      },
      {} as Record<
        string,
        {
          email_confirmed_at: string | null
          email: string
          last_sign_in_at: string | null
          created_at: string | null
        }
      >,
    )

    return NextResponse.json({ verificationMap })
  } catch (error: any) {
    console.error("[v0] Error in get-auth-users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

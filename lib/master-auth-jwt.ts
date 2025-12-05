import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.MASTER_ADMIN_PASSWORD || "fallback-secret-key")

export interface MasterAuthPayload {
  email: string
  role: "masteradmin" | "superuser"
  superuserRole?: "support" | "admin" // For superusers, their specific role
  impersonating?: string
  exp?: number
}

export async function createMasterAuthToken(payload: Omit<MasterAuthPayload, "exp">): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

export async function verifyMasterAuthToken(token: string): Promise<MasterAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as MasterAuthPayload
  } catch {
    return null
  }
}

export async function setMasterAuthCookie(payload: Omit<MasterAuthPayload, "exp">) {
  const token = await createMasterAuthToken(payload)
  const cookieStore = await cookies()
  cookieStore.set("master-auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })
}

export async function setImpersonationCookie(
  masterEmail: string,
  masterRole: "masteradmin" | "superuser",
  impersonatedUserId: string,
  superuserRole?: "support" | "admin",
) {
  await setMasterAuthCookie({
    email: masterEmail,
    role: masterRole,
    superuserRole,
    impersonating: impersonatedUserId,
  })
}

export async function clearImpersonation(
  masterEmail: string,
  masterRole: "masteradmin" | "superuser",
  superuserRole?: "support" | "admin",
) {
  await setMasterAuthCookie({
    email: masterEmail,
    role: masterRole,
    superuserRole,
    // No impersonating field = not impersonating
  })
}

export async function getMasterAuthPayload(): Promise<MasterAuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("master-auth")?.value
  if (!token) return null
  return await verifyMasterAuthToken(token)
}

export async function clearMasterAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("master-auth")
}

export function generateUserSpecificUrl(userEmail: string, role: "admin" | "staff", path = "") {
  const basePath = `/${role}/${encodeURIComponent(userEmail)}`
  return path ? `${basePath}${path.startsWith("/") ? path : `/${path}`}` : basePath
}

export function extractUserFromUrl(pathname: string): { userEmail: string | null; role: string | null } {
  const pathSegments = pathname.split("/").filter(Boolean)

  if (
    pathSegments.length >= 2 &&
    (pathSegments[0] === "admin" || pathSegments[0] === "staff") &&
    pathSegments[1].includes("@")
  ) {
    return {
      userEmail: decodeURIComponent(pathSegments[1]),
      role: pathSegments[0],
    }
  }

  return { userEmail: null, role: null }
}

export function generateSessionId(userEmail: string): string {
  return `user_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`
}

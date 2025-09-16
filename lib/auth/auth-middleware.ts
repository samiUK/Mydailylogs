import { TokenStorage } from "./token-storage"

export function setupAuthInterceptor() {
  if (typeof window === "undefined") return

  // Intercept all fetch requests to add Authorization header
  const originalFetch = window.fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = TokenStorage.getAccessToken()

    if (token && init) {
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      }
    } else if (token) {
      init = {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    }

    return originalFetch(input, init)
  }

  // Check authentication status on page load
  const checkAuth = () => {
    const isProtectedRoute =
      window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/staff")

    if (isProtectedRoute && !TokenStorage.isAuthenticated()) {
      console.log("[v0] No valid token found, redirecting to login")
      window.location.href = "/auth/login"
    }
  }

  // Run auth check on page load
  checkAuth()

  // Run auth check when navigating
  window.addEventListener("popstate", checkAuth)
}

export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = "supabase_access_token"
  private static readonly REFRESH_TOKEN_KEY = "supabase_refresh_token"
  private static readonly USER_KEY = "supabase_user"

  static setTokens(accessToken: string, refreshToken: string, user: any) {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY)
    }
    return null
  }

  static getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY)
    }
    return null
  }

  static getUser(): any | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem(this.USER_KEY)
      return user ? JSON.parse(user) : null
    }
    return null
  }

  static clearTokens() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser()
  }
}

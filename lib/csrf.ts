import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"

function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET
  if (!secret) {
    // Generate a deterministic secret for development if not set
    if (process.env.NODE_ENV === "development") {
      console.warn("[SECURITY] CSRF_SECRET not set, using development-only secret")
      return "dev-csrf-secret-do-not-use-in-production"
    }
    throw new Error("CSRF_SECRET environment variable is required")
  }
  return secret
}

export function generateCsrfToken(): string {
  const csrfSecret = getCsrfSecret()
  const raw = randomBytes(32).toString("hex")
  const token = createHash("sha256").update(`${raw}${csrfSecret}`).digest("hex")
  return `${raw}:${token}`
}

export function validateCsrfToken(fullToken: string): boolean {
  const csrfSecret = getCsrfSecret()
  const [raw, token] = fullToken.split(":")
  if (!raw || !token) return false
  const expected = createHash("sha256")
    .update(`${raw}${csrfSecret}`)
    .digest("hex")
  return expected === token
}

export async function setCsrfCookie() {
  const cookieStore = await cookies()
  const token = generateCsrfToken()
  cookieStore.set("csrf_token", token, {
    httpOnly: false,
    secure: true,
    path: "/",
  })
}

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { generateCsrfToken } from "@/lib/csrf"

export async function GET() {
  const token = generateCsrfToken()
  const cookieStore = await cookies()
  cookieStore.set("csrf_token", token, {
    httpOnly: false,
    secure: true,
    path: "/",
  })

  return NextResponse.json({ ok: true })
}

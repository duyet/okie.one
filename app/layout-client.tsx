"use client"

import { useEffect } from "react"

export function LayoutClient() {
  useEffect(() => {
    fetch("/api/csrf")
  }, [])
  return null
}

"use client"

import { API_ROUTE_CSRF } from "@/lib/routes"
import { useEffect } from "react"

export function LayoutClient() {
  useEffect(() => {
    const init = async () => {
      fetch(API_ROUTE_CSRF)
    }

    init()
  }, [])
  return null
}

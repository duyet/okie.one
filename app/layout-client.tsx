"use client"

import { useQuery } from "@tanstack/react-query"

import { API_ROUTE_CSRF } from "@/lib/routes"

export function LayoutClient() {
  useQuery({
    queryKey: ["csrf-init"],
    queryFn: async () => {
      await fetch(API_ROUTE_CSRF)
      return true
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  return null
}

import { useEffect, useState } from "react"

/**
 * Hook to prevent hydration mismatches by ensuring consistent initial state
 * between server and client
 */
export function useHydrationSafe() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

/**
 * Hook to safely use breakpoint values without hydration mismatches
 */
export function useHydrationSafeBreakpoint(
  breakpoint: number,
  defaultValue: boolean = false
) {
  const [isBelowBreakpoint, setIsBelowBreakpoint] =
    useState<boolean>(defaultValue)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const checkBreakpoint = () => {
      setIsBelowBreakpoint(window.innerWidth < breakpoint)
    }

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    mql.addEventListener("change", checkBreakpoint)
    checkBreakpoint()
    setIsHydrated(true)

    return () => mql.removeEventListener("change", checkBreakpoint)
  }, [breakpoint])

  return { isBelowBreakpoint, isHydrated }
}

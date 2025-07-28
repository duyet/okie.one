/**
 * Test helper for getting dynamic app configuration
 * This ensures tests work regardless of NEXT_PUBLIC_APP_NAME value
 */

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || "Okie"
}

export function getChatPlaceholder(): string {
  return `Ask ${getAppName()}`
}

export function getMessagePlaceholder(): string {
  return `Message ${getAppName()}...`
}

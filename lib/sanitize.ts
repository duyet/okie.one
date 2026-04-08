import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

/**
 * Sanitize user input to prevent XSS attacks.
 * This is a server-only function - jsdom cannot run in the browser.
 *
 * IMPORTANT: Only import this in server components or API routes.
 * Do NOT import in client components (marked with "use client").
 */
export function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input)
}

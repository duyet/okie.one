import type { ContentPart } from "@/app/types/api.types"

export interface ArtifactCandidate {
  type: "code" | "document" | "html" | "data"
  content: string
  language?: string
  title: string
  startIndex: number
  endIndex: number
}

// Configuration for artifact detection
const ARTIFACT_CONFIG = {
  MIN_CODE_LINES: 20,
  MIN_DOCUMENT_CHARS: 1000,
  MIN_HTML_CHARS: 200,
  MAX_TITLE_LENGTH: 60,
} as const

// Language detection patterns
const LANGUAGE_PATTERNS = {
  html: /<!DOCTYPE|<html|<head|<body/i,
  css: /@media|@keyframes|\.[\w-]+\s*\{|\w+\s*:\s*[\w-]+/,
  javascript: /function\s+\w+|const\s+\w+\s*=|class\s+\w+|import\s+.+from/,
  typescript: /interface\s+\w+|type\s+\w+\s*=|export\s+(default\s+)?class/,
  python: /def\s+\w+|class\s+\w+|import\s+\w+|from\s+\w+\s+import/,
  json: /^\s*\{[\s\S]*\}\s*$|^\s*\[[\s\S]*\]\s*$/,
  sql: /SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/i,
} as const

/**
 * Detects and parses artifacts from AI response text
 */
export function parseArtifacts(responseText: string): ContentPart[] {
  const artifacts: ContentPart[] = []
  const candidates = extractArtifactCandidates(responseText)

  for (const candidate of candidates) {
    if (shouldCreateArtifact(candidate)) {
      const artifact = createArtifactPart(candidate)
      if (artifact) {
        artifacts.push(artifact)
      }
    }
  }

  return artifacts
}

/**
 * Extract potential artifact candidates from response text
 */
function extractArtifactCandidates(text: string): ArtifactCandidate[] {
  const candidates: ArtifactCandidate[] = []

  // Extract code blocks
  const codeBlockRegex = /```(?:(\w+)\s*)?\n([\s\S]*?)\n```/g
  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const [fullMatch, language, content] = match
    const startIndex = match.index
    const endIndex = match.index + fullMatch.length

    candidates.push({
      type: "code",
      content: content.trim(),
      language: language?.toLowerCase(),
      title: generateCodeTitle(content, language),
      startIndex,
      endIndex,
    })
  }

  // Extract HTML documents (look for complete HTML structures)
  const htmlRegex = /<!DOCTYPE[\s\S]*?<\/html>/gi
  while ((match = htmlRegex.exec(text)) !== null) {
    const content = match[0]
    const startIndex = match.index
    const endIndex = match.index + content.length

    candidates.push({
      type: "html",
      content,
      title: extractHtmlTitle(content) || "HTML Document",
      startIndex,
      endIndex,
    })
  }

  // Extract large structured text (potential documents)
  // Look for sections with headers, multiple paragraphs
  const documentRegex = /(^|\n)#+\s+.+[\s\S]*?(?=\n#+\s+|\n```|\n<|$)/gm
  while ((match = documentRegex.exec(text)) !== null) {
    const content = match[0].trim()
    const startIndex = match.index
    const endIndex = match.index + match[0].length

    // Skip if it's inside a code block or too short
    if (
      content.length >= ARTIFACT_CONFIG.MIN_DOCUMENT_CHARS &&
      !isInsideCodeBlock(text, startIndex)
    ) {
      candidates.push({
        type: "document",
        content,
        title: extractDocumentTitle(content),
        startIndex,
        endIndex,
      })
    }
  }

  return candidates
}

/**
 * Determine if a candidate should become an artifact
 */
function shouldCreateArtifact(candidate: ArtifactCandidate): boolean {
  switch (candidate.type) {
    case "code":
      const lines = candidate.content.split("\n").length
      return lines >= ARTIFACT_CONFIG.MIN_CODE_LINES

    case "document":
      return candidate.content.length >= ARTIFACT_CONFIG.MIN_DOCUMENT_CHARS

    case "html":
      return candidate.content.length >= ARTIFACT_CONFIG.MIN_HTML_CHARS

    case "data":
      return candidate.content.length > 100

    default:
      return false
  }
}

/**
 * Create an artifact ContentPart from a candidate
 */
function createArtifactPart(candidate: ArtifactCandidate): ContentPart | null {
  const id = generateArtifactId()
  const now = new Date().toISOString()
  const size = candidate.content.length
  const lines =
    candidate.type === "code" ? candidate.content.split("\n").length : undefined

  // Detect language if not provided
  const language =
    candidate.language || detectLanguage(candidate.content, candidate.type)

  return {
    type: "artifact",
    artifact: {
      id,
      type: candidate.type,
      title: candidate.title.slice(0, ARTIFACT_CONFIG.MAX_TITLE_LENGTH),
      content: candidate.content,
      language,
      metadata: {
        size,
        lines,
        created: now,
      },
    },
  }
}

/**
 * Generate a unique artifact ID
 */
function generateArtifactId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a title for code artifacts
 */
function generateCodeTitle(content: string, language?: string): string {
  // Try to extract meaningful names from code
  const patterns = [
    /(?:class|interface|type)\s+(\w+)/i,
    /(?:function|const|let|var)\s+(\w+)/i,
    /(?:def|fn)\s+(\w+)/i,
    /(\w+)\s*[=:]\s*(?:function|\()/i,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match?.[1]) {
      const name = match[1]
      const langSuffix = language ? ` (${language})` : ""
      return `${name}${langSuffix}`
    }
  }

  // Fallback to language-based titles
  const langTitles = {
    javascript: "JavaScript Code",
    typescript: "TypeScript Code",
    python: "Python Script",
    html: "HTML Code",
    css: "CSS Styles",
    sql: "SQL Query",
    json: "JSON Data",
  } as const

  return langTitles[language as keyof typeof langTitles] || "Code Snippet"
}

/**
 * Extract title from HTML content
 */
function extractHtmlTitle(html: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  return titleMatch?.[1]?.trim() || null
}

/**
 * Extract title from document content
 */
function extractDocumentTitle(content: string): string {
  // Look for the first heading
  const headingMatch = content.match(/^#+\s+(.+)$/m)
  if (headingMatch?.[1]) {
    return headingMatch[1].trim()
  }

  // Fallback to first line if it looks like a title
  const firstLine = content.split("\n")[0]?.trim()
  if (firstLine && firstLine.length < 100 && !firstLine.includes(".")) {
    return firstLine
  }

  return "Document"
}

/**
 * Detect programming language from content
 */
function detectLanguage(content: string, type: string): string | undefined {
  if (type !== "code") return undefined

  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(content)) {
      return lang
    }
  }

  return undefined
}

/**
 * Check if a position is inside a code block
 */
function isInsideCodeBlock(text: string, position: number): boolean {
  const beforeText = text.substring(0, position)
  const codeBlockStarts = (beforeText.match(/```/g) || []).length
  return codeBlockStarts % 2 === 1
}

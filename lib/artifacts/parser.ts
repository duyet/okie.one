import { v4 as uuidv4 } from "uuid"

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
  MIN_CODE_LINES: 10, // Lowered for better streaming artifact creation
  MIN_DOCUMENT_CHARS: 300,
  MIN_HTML_CHARS: 100, // Lowered for responsive examples
  MAX_TITLE_LENGTH: 60,
  STREAMING_MIN_CODE_LINES: 8, // Much lower threshold for early detection during streaming
  STREAMING_MIN_CHARS: 150, // Lower threshold for early artifact detection
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
  markdown: /^#+\s+.+|\*\*.*\*\*|\*.*\*|\[.*\]\(.*\)|```/m,
} as const

/**
 * Detects and parses artifacts from AI response text
 */
export function parseArtifacts(
  responseText: string,
  isStreaming = false
): ContentPart[] {
  const artifacts: ContentPart[] = []
  const candidates = extractArtifactCandidates(responseText)

  // Filter candidates to prefer comprehensive documents over individual code blocks
  const filteredCandidates = prioritizeComprehensiveArtifacts(candidates)

  for (const candidate of filteredCandidates) {
    if (shouldCreateArtifact(candidate, isStreaming)) {
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

  // Extract code blocks (make trailing newline optional)
  const codeBlockRegex = /```(?:(\w+)\s*)?\n?([\s\S]*?)\n?```/g
  let match: RegExpExecArray | null = codeBlockRegex.exec(text)
  while (match !== null) {
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

    match = codeBlockRegex.exec(text)
  }

  // Extract HTML documents (look for complete HTML structures)
  const htmlRegex = /<!DOCTYPE[\s\S]*?<\/html>/gi
  match = htmlRegex.exec(text)
  while (match !== null) {
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

    match = htmlRegex.exec(text)
  }

  // Extract large structured text (potential documents)
  // Look for documents that start with a main heading and contain substantial markdown content
  const documentRegex = /^#+\s+[^\n]+[\s\S]*$/m
  const documentMatch = documentRegex.exec(text)
  if (documentMatch && !isInsideCodeBlock(text, documentMatch.index)) {
    const content = documentMatch[0].trim()
    const startIndex = documentMatch.index
    const endIndex = documentMatch.index + documentMatch[0].length

    // Check if it's long enough and has structure (multiple headings)
    const headingCount = (content.match(/^#+\s+/gm) || []).length
    if (
      content.length >= ARTIFACT_CONFIG.MIN_DOCUMENT_CHARS &&
      headingCount >= 2
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
 * Prioritize comprehensive artifacts over multiple small code blocks
 * If we detect a document-like structure, prefer that over individual code blocks
 */
function prioritizeComprehensiveArtifacts(
  candidates: ArtifactCandidate[]
): ArtifactCandidate[] {
  // If we have a document candidate that's substantial, prefer it over code blocks
  const documentCandidates = candidates.filter((c) => c.type === "document")
  const codeCandidates = candidates.filter((c) => c.type === "code")

  // If we have a substantial document (>1000 chars) with multiple headings,
  // prefer it over individual code blocks
  const substantialDocs = documentCandidates.filter((doc) => {
    const headingCount = (doc.content.match(/^#+\s+/gm) || []).length
    return doc.content.length > 1000 && headingCount >= 2
  })

  if (substantialDocs.length > 0) {
    // Return the document plus any HTML/standalone artifacts
    return [
      ...substantialDocs,
      ...candidates.filter((c) => c.type === "html" || c.type === "data"),
    ]
  }

  // If we have many small code blocks (>2) in a response that looks like documentation,
  // try to detect if this should be a single markdown document instead
  if (codeCandidates.length > 2) {
    const totalContent = candidates.map((c) => c.content).join("\n\n")
    const hasMarkdownStructure =
      /^#+\s+/m.test(totalContent) &&
      totalContent.includes("```") &&
      totalContent.length > 800

    if (hasMarkdownStructure) {
      // Create a comprehensive markdown document from the entire response
      const fullContent = totalContent
      return [
        {
          type: "document" as const,
          content: fullContent,
          title: extractDocumentTitle(fullContent) || "Comprehensive Guide",
          startIndex: 0,
          endIndex: fullContent.length,
        },
      ]
    }
  }

  // Otherwise return all candidates
  return candidates
}

/**
 * Determine if a candidate should become an artifact
 */
function shouldCreateArtifact(
  candidate: ArtifactCandidate,
  isStreaming = false
): boolean {
  switch (candidate.type) {
    case "code": {
      const lines = candidate.content.split("\n").length
      const threshold = isStreaming
        ? ARTIFACT_CONFIG.STREAMING_MIN_CODE_LINES
        : ARTIFACT_CONFIG.MIN_CODE_LINES
      return lines >= threshold
    }

    case "document": {
      const threshold = isStreaming
        ? ARTIFACT_CONFIG.STREAMING_MIN_CHARS
        : ARTIFACT_CONFIG.MIN_DOCUMENT_CHARS
      return candidate.content.length >= threshold
    }

    case "html": {
      const threshold = isStreaming
        ? ARTIFACT_CONFIG.STREAMING_MIN_CHARS
        : ARTIFACT_CONFIG.MIN_HTML_CHARS
      return candidate.content.length >= threshold
    }

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
 * Generate a unique artifact ID using UUID
 */
function generateArtifactId(): string {
  return `art_${uuidv4()}`
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
    markdown: "Markdown Document",
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

/**
 * Replace inline code blocks with artifact placeholders during streaming
 * This enables the transition from inline code to artifacts that the user expects
 */
export function replaceCodeBlocksWithArtifacts(
  text: string,
  artifacts: ContentPart[]
): string {
  if (artifacts.length === 0) return text

  let result = text
  const codeBlockRegex = /```(?:(\w+)\s*)?\n?([\s\S]*?)\n?```/g

  // Create a map of artifacts by content for better matching
  const artifactsByContent = new Map<string, ContentPart>()
  artifacts.forEach((artifact) => {
    if (artifact.artifact) {
      const normalizedContent = artifact.artifact.content
        .trim()
        .replace(/\s+/g, " ")
      artifactsByContent.set(normalizedContent, artifact)
    }
  })

  result = result.replace(codeBlockRegex, (match, _language, content) => {
    const normalizedContent = content.trim().replace(/\s+/g, " ")

    // Try to find a matching artifact
    let matchingArtifact: ContentPart | undefined

    // First try exact match
    matchingArtifact = artifactsByContent.get(normalizedContent)

    // If no exact match, try partial matching for streaming scenarios
    if (!matchingArtifact) {
      for (const [artifactContent, artifact] of artifactsByContent) {
        if (
          // Check if artifact content includes the code block content (streaming case)
          (artifactContent.includes(normalizedContent) &&
            normalizedContent.length > 100) ||
          // Check if code block content includes the artifact content (completion case)
          (normalizedContent.includes(artifactContent) &&
            artifactContent.length > 100) ||
          // Match if both are substantial and similar (fuzzy match)
          (normalizedContent.length > 200 &&
            artifactContent.length > 200 &&
            calculateSimilarity(normalizedContent, artifactContent) > 0.8)
        ) {
          matchingArtifact = artifact
          break
        }
      }
    }

    if (matchingArtifact?.artifact) {
      console.log(
        `🔄 Replacing code block with artifact preview: ${matchingArtifact.artifact.id}`
      )
      // Return a special marker that will be replaced with ArtifactPreview component
      return `\n\n[ARTIFACT_PREVIEW:${matchingArtifact.artifact.id}]\n\n`
    }

    return match
  })

  return result
}

/**
 * Calculate similarity between two strings using a simple ratio
 */
function calculateSimilarity(str1: string, str2: string): number {
  const shorter = str1.length < str2.length ? str1 : str2
  const longer = str1.length < str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(shorter, longer)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings (simplified version)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

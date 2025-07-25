import { describe, expect, it, vi } from "vitest"

import { parseArtifacts } from "@/lib/artifacts/parser"

// Mock UUID to make tests deterministic
vi.mock("uuid", () => ({
  v4: () => "mocked-uuid-1234",
}))

describe("Artifacts Parser", () => {
  describe("parseArtifacts", () => {
    it("should parse code blocks longer than 20 lines", () => {
      const responseText = `
Here's a React component:

\`\`\`typescript
import React from 'react'

interface Props {
  title: string
  items: string[]
}

const TodoList: React.FC<Props> = ({ title, items }) => {
  const [newItem, setNewItem] = React.useState('')
  
  const handleAdd = () => {
    if (newItem.trim()) {
      // Add item logic here
      setNewItem('')
    }
  }

  return (
    <div className="todo-list">
      <h2>{title}</h2>
      <input 
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        placeholder="Add new item"
      />
      <button onClick={handleAdd}>Add</button>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default TodoList
\`\`\`

This component provides a basic todo list interface.
      `

      const artifacts = parseArtifacts(responseText)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]).toEqual({
        type: "artifact",
        artifact: {
          id: "art_mocked-uuid-1234",
          type: "code",
          title: "Props (typescript)", // Parser extracts first interface/class name
          content: expect.stringContaining("import React from 'react'"),
          language: "typescript",
          metadata: {
            size: expect.any(Number),
            lines: expect.any(Number),
            created: expect.any(String),
          },
        },
      })
    })

    it("should not create artifacts for short code blocks", () => {
      const responseText = `
Here's a simple function:

\`\`\`javascript
function hello() {
  return "Hello World"
}
\`\`\`

This is just a small example.
      `

      const artifacts = parseArtifacts(responseText)
      expect(artifacts).toHaveLength(0)
    })

    it("should parse HTML documents", () => {
      const responseText = `
Here's a complete HTML page:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .hero { text-align: center; padding: 50px; background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="hero">
        <h1>Welcome to Our Site</h1>
        <p>This is a beautiful landing page.</p>
        <button onclick="alert('Hello!')">Click Me</button>
    </div>
</body>
</html>

This creates a simple landing page with styling and interactivity.
      `

      const artifacts = parseArtifacts(responseText)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]).toEqual({
        type: "artifact",
        artifact: {
          id: "art_mocked-uuid-1234",
          type: "html",
          title: "Landing Page",
          content: expect.stringContaining("<!DOCTYPE html>"),
          language: undefined,
          metadata: {
            size: expect.any(Number),
            created: expect.any(String),
          },
        },
      })
    })

    it("should parse large document content", () => {
      const longDocument = `# API Documentation

## Overview
This document provides comprehensive information about our REST API.

## Authentication
All API requests require authentication using Bearer tokens.

## Endpoints

### GET /users
Retrieves a list of all users in the system.

**Parameters:**
- \`limit\` (optional): Maximum number of users to return (default: 100)
- \`offset\` (optional): Number of users to skip (default: 0)

**Response:**
The API returns a JSON object with user data and pagination information.

### POST /users
Creates a new user in the system.

**Request Body:**
The request must include name, email, and password fields in JSON format.

**Response:**
Returns the created user object with generated ID and timestamp.

## Error Handling
The API uses standard HTTP status codes to indicate success or failure.

### Common Error Codes
- \`400\` - Bad Request: Invalid request format
- \`401\` - Unauthorized: Missing or invalid authentication
- \`403\` - Forbidden: Insufficient permissions
- \`404\` - Not Found: Resource does not exist  
- \`500\` - Internal Server Error: Unexpected server error

## Rate Limiting
API requests are limited to 1000 requests per hour per authenticated user.

## SDKs and Libraries
We provide official SDKs for popular programming languages:
- JavaScript/Node.js
- Python
- PHP
- Ruby
- Go

Please refer to our GitHub repositories for installation and usage instructions.`

      const artifacts = parseArtifacts(longDocument)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]).toEqual({
        type: "artifact",
        artifact: {
          id: "art_mocked-uuid-1234",
          type: "document",
          title: "API Documentation",
          content: expect.stringContaining("# API Documentation"),
          language: undefined,
          metadata: {
            size: expect.any(Number),
            created: expect.any(String),
          },
        },
      })
    })

    it("should handle code blocks without trailing newlines", () => {
      const responseText = `
Here's some code:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def main():
    for i in range(10):
        print(f"fib({i}) = {fibonacci(i)}")
    
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

def process_data(data):
    results = []
    for item in data:
        if item > 0:
            results.append(item * 2)
    return results

if __name__ == "__main__":
    main()
    data = [1, 2, 3, 4, 5]
    print(f"Sum: {calculate_sum(data)}")
    print(f"Processed: {process_data(data)}")\`\`\`

This code demonstrates recursion and data processing.
      `

      const artifacts = parseArtifacts(responseText)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].artifact?.type).toBe("code")
      expect(artifacts[0].artifact?.language).toBe("python")
    })

    it("should detect language from code content when not specified", () => {
      const responseText = `
Here's some code:

\`\`\`
function createComponent() {
  return React.createElement('div', {
    className: 'my-component'
  }, 'Hello World')
}

const MyComponent = () => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    document.title = \`Count: \${count}\`
  }, [count])
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

export default MyComponent
\`\`\`
      `

      const artifacts = parseArtifacts(responseText)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].artifact?.language).toBe("javascript")
    })

    it("should generate appropriate titles for different content types", () => {
      const codeText = `
\`\`\`typescript
class UserService {
  async getUser(id: number) {
    return await this.userRepository.findById(id)
  }
  
  async createUser(userData: CreateUserDto) {
    return await this.userRepository.create(userData)
  }
  
  async updateUser(id: number, updates: UpdateUserDto) {
    return await this.userRepository.update(id, updates)
  }
  
  async deleteUser(id: number) {
    return await this.userRepository.delete(id)
  }
  
  async getUsersByRole(role: string) {
    return await this.userRepository.findByRole(role)
  }
}
\`\`\`
      `

      const artifacts = parseArtifacts(codeText)

      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].artifact?.title).toBe("UserService (typescript)")
    })

    it("should handle multiple artifacts in the same response", () => {
      const responseText = `
Here's the HTML structure:

<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Hello</h1>
  <div class="container">
    <p>This is a test page with some content.</p>
    <button class="button">Click me</button>
  </div>
</body>
</html>

And here's the accompanying CSS:

\`\`\`css
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background: #0056b3;
}
\`\`\`
      `

      const artifacts = parseArtifacts(responseText)

      expect(artifacts).toHaveLength(2)
      // Parser processes code blocks first, then HTML
      expect(artifacts[0].artifact?.type).toBe("code")
      expect(artifacts[0].artifact?.language).toBe("css")
      expect(artifacts[1].artifact?.type).toBe("html")
    })

    it("should not create artifacts for content inside code blocks", () => {
      const responseText = `
Here's how to create HTML:

\`\`\`markdown
# My Document

To create a webpage, use this HTML:

<!DOCTYPE html>
<html>
<head><title>Page</title></head>
<body>Content here</body>
</html>

This creates a basic page structure.

## Adding Content

You can add paragraphs, headings, and other elements:

- Lists like this one
- With multiple items
- And nested content

### Code Examples

Show code like this:
- Use backticks for inline code
- Use triple backticks for blocks
- Always specify the language

## Conclusion

This guide covers the basics of HTML document creation.
\`\`\`
      `

      const artifacts = parseArtifacts(responseText)

      // Should only create one artifact for the markdown code block (if it's long enough), not for the HTML inside it
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].artifact?.type).toBe("code")
      expect(artifacts[0].artifact?.language).toBe("markdown")
    })

    it("should handle empty or invalid input gracefully", () => {
      expect(parseArtifacts("")).toEqual([])
      expect(
        parseArtifacts("Just some regular text without any artifacts")
      ).toEqual([])
      expect(parseArtifacts("```\n\n```")).toEqual([])
    })
  })
})

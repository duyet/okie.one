# Chat API Validation E2E Tests

This document describes the comprehensive E2E tests created to verify the chat API validation fix.

## Overview

The `api-chat-validation.spec.ts` file contains comprehensive E2E tests that verify the `/api/chat` endpoint correctly validates requests and provides helpful error messages for missing required fields and legacy request formats.

## Test Coverage

### 1. Required Field Validation (6 tests)
- **Missing chatId field**: Verifies rejection when `chatId` is missing
- **Missing userId field**: Verifies rejection when `userId` is missing
- **Missing model field**: Verifies rejection when `model` is missing
- **Missing messages field**: Verifies rejection when `messages` is missing
- **Empty messages array**: Verifies rejection when `messages` is empty
- **Multiple missing fields**: Verifies correct handling of multiple missing fields

### 2. Legacy Request Format Handling (2 tests)
- **Legacy format rejection**: Tests the exact legacy request format that was failing
- **Old 'id' vs new 'chatId'**: Verifies proper guidance about field name changes

### 3. Invalid JSON Handling (2 tests)
- **Malformed JSON**: Tests handling of syntactically invalid JSON
- **Empty request body**: Tests handling of completely empty requests

### 4. Valid Request Handling (4 tests)
- **Valid request acceptance**: Verifies that properly formatted requests pass validation
- **AI SDK v5 format**: Tests modern message format with parts
- **Modern tools configuration**: Tests new tools array format
- **Various thinking modes**: Tests all supported thinking modes

### 5. Error Response Format Validation (2 tests)
- **Consistent error format**: Verifies error response structure consistency
- **Migration guidance**: Tests helpful error messages for developers

## Key Features Tested

### Validation Logic
- ✅ Required fields: `chatId`, `userId`, `model`, `messages` (non-empty array)
- ✅ Specific error messages for each missing field
- ✅ Helpful migration guidance from legacy formats
- ✅ Proper HTTP status codes (400 for validation errors)

### Error Response Structure
```json
{
  "error": "Missing required fields: chatId or id, userId, model. Please provide all required fields in the request body.",
  "missingFields": ["chatId or id", "userId", "model"],
  "expectedFormat": {
    "chatId": "string (required)",
    "userId": "string (required)",
    "model": "string (required)",
    "messages": "[{role: 'user', content: '...', parts: [...]}]",
    "isAuthenticated": "boolean (required)",
    "systemPrompt": "string (required)",
    "tools": "[{type: 'web_search' | 'mcp', name?: string}] (optional)",
    "thinkingMode": "'none' | 'regular' | 'sequential' (optional)"
  }
}
```

### Modern API Features
- ✅ AI SDK v5 message format with `parts` array
- ✅ Modern tools configuration array
- ✅ Thinking modes: `none`, `regular`, `sequential`
- ✅ Support for MCP tools and web search

## Test Results

All **48 tests pass** successfully, covering:

- **16 tests** across 3 browser environments (Chromium, Firefox, Mobile Chrome)
- **Comprehensive validation** of the API validation fix
- **Edge cases** like malformed JSON and empty requests
- **Backwards compatibility** testing with legacy formats
- **Modern feature support** for AI SDK v5 patterns

## Benefits

1. **Prevents Regressions**: Ensures the validation fix won't break in the future
2. **Real Environment Testing**: E2E tests verify behavior in actual browser environment
3. **Comprehensive Coverage**: Tests all validation scenarios and edge cases
4. **Developer Guidance**: Validates that helpful error messages are provided
5. **CI/CD Integration**: Can run in continuous integration pipelines

## Running the Tests

```bash
# Run all API validation tests
pnpm test:e2e tests/e2e/api-chat-validation.spec.ts

# Run with specific reporter
pnpm test:e2e tests/e2e/api-chat-validation.spec.ts --reporter=line

# Run in single worker mode (avoid conflicts)
pnpm test:e2e tests/e2e/api-chat-validation.spec.ts --workers=1
```

## Integration

These tests complement the existing unit tests in `tests/api/chat-request-validation.test.ts` by:
- Testing in real browser environment vs mocked Node.js environment
- Validating actual HTTP requests vs function calls
- Ensuring consistent behavior across browser engines
- Testing network-level behavior and timeouts

The E2E tests provide confidence that the chat API validation fix works correctly in production-like conditions.
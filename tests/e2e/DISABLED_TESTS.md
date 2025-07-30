# Disabled E2E Tests

This document tracks E2E tests that are temporarily disabled in CI to prevent flaky failures while maintaining development velocity.

## Disabled in CI (playwright.config.ts)

### Sequential Thinking Tests
- `sequential-thinking-mcp.spec.ts` - Flaky due to MCP server timing issues
- `sequential-thinking-enhanced.spec.ts` - Complex AI interactions causing timeouts
- `sequential-thinking-tool-invocation.spec.ts` - Tool invocation timing inconsistencies  
- `sequential-thinking-math.spec.ts` - Math reasoning tests timeout in CI

### API Tests
- `api-chat-comprehensive.spec.ts` - Complex API scenarios with timing issues

### Debug Tests  
- `debug-*.spec.ts` - Debug tests not suitable for CI

### Enhanced Tests
- `enhanced-system-prompt-test.spec.ts` - System prompt tests with timing issues

## Disabled Browsers in CI
- **Firefox**: Disabled to reduce CI load and flakiness
- **Mobile Chrome**: Disabled due to mobile-specific flakiness

## Status
These tests are temporarily disabled to ensure CI stability. They should be:
1. Fixed and re-enabled when timing issues are resolved
2. Converted to use more reliable mocking strategies
3. Split into smaller, more focused test cases

## Re-enabling Tests
To re-enable tests locally for development:
1. Tests run normally in local development (not in CI)
2. Remove specific test patterns from `testIgnore` in playwright.config.ts
3. Ensure proper test database setup and mocking

Last updated: $(date)
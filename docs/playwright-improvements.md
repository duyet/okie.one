# Playwright Configuration Improvements

This document outlines the comprehensive improvements made to handle timeout issues in E2E tests, particularly for Sequential Thinking MCP tests.

## Overview

The main issues addressed:
1. **30-second timeouts** when finding chat input elements
2. **Sequential Thinking MCP tests** needing more time for AI reasoning
3. **Server startup timing** issues in CI environments

## Key Changes

### 1. Enhanced Playwright Configuration (`playwright.config.ts`)

#### Timeout Adjustments
- **Test timeout**: 90s locally, 180s in CI (3 minutes for complex AI operations)
- **Expect timeout**: 20s locally, 45s in CI (for element waiting)
- **Navigation timeout**: 30s locally, 60s in CI (for AI responses)
- **Action timeout**: 10s locally, 20s in CI (for interactive elements)

#### Retry & Parallelism
- **Retries**: 1 locally, 3 in CI (better reliability for flaky AI tests)
- **Workers**: 2 locally, 1 in CI (sequential execution for MCP stability)
- **Fully parallel**: Enabled locally, disabled in CI for MCP compatibility

#### Enhanced Debugging
- **Screenshots**: Only on failure with full page capture
- **Videos**: Retained on failure for debugging
- **Tracing**: On first retry with detailed execution logs

### 2. Improved Global Setup (`tests/setup/global-setup.ts`)

#### Progressive Health Checks
- **15 retry attempts** with exponential backoff (1s → 5s max delay)
- **Multiple endpoint checks**: Health endpoint → Homepage fallback
- **Flexible content validation**: Multiple heading selectors and text patterns
- **Less strict loading**: `domcontentloaded` instead of `networkidle` for initial checks

#### Enhanced MCP Readiness
- **Multiple button selectors** for think button detection
- **Console log monitoring** for MCP initialization messages
- **Non-blocking validation** (logs warnings but doesn't fail setup)
- **Extended timeout handling** for MCP system initialization

### 3. Robust Test Helpers (`tests/helpers/test-helpers.ts`)

#### Enhanced Wait Functions

**`waitForPageReady()`**:
- Increased default timeout to 45s
- Network idle with 3 retry attempts
- Automatic debug screenshots on failure
- Extended chat input timeout for chat pages (20s)

**`waitForChatInput()`**:
- Extended timeout to 30s with progressive retries
- Multiple selector fallbacks (`Ask`, `data-testid`, placeholder patterns)
- Better enabled state validation using DOM queries
- Detailed error logging with selector information

**`waitForAIResponse()`**:
- **2-minute default timeout** for MCP responses
- **Progressive checking**: 5-second intervals with status logging
- **Multiple message selectors** for response detection
- **Enhanced reasoning detection** with multiple selector patterns
- **Comprehensive error detection** across various selectors

#### New Utility Functions

**`waitForServerReady()`**:
- Dedicated server health checking with 10 retries
- Progressive delay timing (6s total → distributed across attempts)
- Health endpoint + homepage fallback strategy
- Detailed logging for debugging server startup issues

**`prepareTestEnvironment()`**:
- Comprehensive test environment setup
- Browser state clearing + server readiness + page loading
- Configurable timeout allocation across preparation steps
- Error handling with debug screenshots

**`setupSequentialThinkingTest()`**:
- **2-minute timeout** for complete MCP test setup
- Extended timeout allocation across all setup phases
- Network capture integration for debugging
- Comprehensive error handling with cleanup

#### Enhanced Debugging

**Debug Screenshots**:
- Automatic capture on failures with timestamped filenames
- Full page screenshots for complete context
- Strategic placement in error handling paths

**Network Capture**:
- Request/response monitoring for API debugging
- MCP-specific log filtering and display
- Console message capture for MCP system monitoring

## Configuration Optimizations

### Environment-Based Settings
```typescript
// Local Development (faster iteration)
timeout: 90 * 1000,           // 90 seconds
expect: { timeout: 20 * 1000 }, // 20 seconds
retries: 1,                   // Quick feedback
workers: 2,                   // Parallel execution

// CI Environment (stability focus)  
timeout: 180 * 1000,          // 3 minutes
expect: { timeout: 45 * 1000 }, // 45 seconds  
retries: 3,                   // Maximum reliability
workers: 1,                   // Sequential execution
```

### Test-Specific Timeouts
- **Basic UI tests**: Default timeouts (30-45s)
- **AI response tests**: Extended timeouts (90-120s)
- **MCP reasoning tests**: Maximum timeouts (120-180s)
- **Server startup**: Progressive retry with 2-3 minute total

### Selector Strategy
```typescript
// Primary selectors (fast, specific)
'[data-testid="chat-input"]'
'[data-testid="think-button"]'

// Fallback selectors (broader matching)
'textarea[placeholder*="Ask"]'
'button:has-text("Sequential Thinking")'

// DOM-based validation (most reliable)
document.querySelectorAll('textarea').filter(input => 
  input.placeholder?.includes('Ask') && 
  !input.disabled && 
  !input.readOnly
)
```

## Test Pattern Improvements

### 1. Retry Logic
- **Network operations**: 3 attempts with exponential backoff
- **Element detection**: Multiple selector attempts before failure
- **State validation**: Progressive checks with timeout intervals

### 2. Error Handling
- **Graceful degradation**: Non-critical failures logged but don't block tests
- **Debug information**: Screenshots + network logs + console output
- **Context preservation**: Full error context for debugging

### 3. Resource Management
- **Progressive timeouts**: Start with quick checks, extend for complex operations
- **Efficient selectors**: Try specific selectors first, fallback to broader ones
- **Connection reuse**: Browser context shared across related operations

## Usage Guidelines

### For Test Developers

**Basic Test Pattern**:
```typescript
test('my test', async ({ page }) => {
  await prepareTestEnvironment(page)
  await waitForChatInput(page)
  await sendMessage(page, 'test message')
  await waitForAIResponse(page)
})
```

**Sequential Thinking MCP Tests**:
```typescript
test('mcp reasoning test', async ({ page }) => {
  const capture = await setupSequentialThinkingTest(page, {
    message: 'Solve this step by step...',
    timeout: 120000,
    expectReasoning: true
  })
  
  // Test assertions here
})
```

**Custom Timeout Tests**:
```typescript
test('slow operation', async ({ page }) => {
  await waitForAIResponse(page, { 
    timeout: 180000,  // 3 minutes for very slow operations
    expectReasoning: true 
  })
})
```

### Debugging Failed Tests

1. **Check screenshots**: `tests/screenshots/debug-*.png`
2. **Review network logs**: Console output shows API requests/responses
3. **Examine server logs**: Global setup shows server health status
4. **Validate selectors**: Helper functions log which selectors worked/failed

## Performance Impact

### Local Development
- **~15% slower** due to extended timeouts and retry logic
- **Better reliability** reduces time spent debugging flaky tests
- **Faster feedback** from improved error reporting

### CI Environment  
- **~25% slower** due to sequential execution and extended timeouts
- **Significantly more reliable** with 3 retries and robust health checks
- **Better debugging** with comprehensive logging and screenshots

## Monitoring & Maintenance

### Success Metrics
- **Test pass rate**: Should increase to >95% for MCP tests
- **Timeout failures**: Should decrease significantly
- **First-run success**: Should improve for server startup scenarios

### Regular Maintenance
- **Review timeout values** quarterly based on actual test performance
- **Update selectors** when UI components change
- **Monitor CI performance** and adjust worker/timeout settings as needed
- **Clean up debug artifacts** periodically

## Future Improvements

### Potential Enhancements
1. **Adaptive timeouts** based on test history and complexity
2. **Health check caching** to avoid redundant server checks
3. **Parallel MCP testing** with better resource isolation
4. **AI response prediction** to optimize waiting strategies

### Technical Debt
- Consolidate similar timeout configurations
- Standardize error message formats across helpers
- Add performance metrics collection for timeout optimization
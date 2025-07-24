import { describe, it, expect } from 'vitest'

// Test actual config module imports
describe('Config Integration', () => {
  it('should load config module successfully', async () => {
    const config = await import('@/lib/config')
    
    expect(config.APP_NAME).toBeDefined()
    expect(config.MESSAGE_MAX_LENGTH).toBeGreaterThan(0)
    expect(config.FREE_MODELS_IDS).toBeInstanceOf(Array)
    expect(config.NON_AUTH_DAILY_MESSAGE_LIMIT).toBeGreaterThan(0)
    expect(config.AUTH_DAILY_MESSAGE_LIMIT).toBeGreaterThan(0)
  })
  
  it('should have valid suggestion configurations', async () => {
    const { SUGGESTIONS } = await import('@/lib/config')
    
    expect(SUGGESTIONS).toBeInstanceOf(Array)
    expect(SUGGESTIONS.length).toBeGreaterThan(0)
    
    SUGGESTIONS.forEach(suggestion => {
      expect(suggestion).toHaveProperty('label')
      expect(suggestion).toHaveProperty('highlight')
      expect(suggestion).toHaveProperty('prompt')
      expect(suggestion).toHaveProperty('items')
      expect(suggestion).toHaveProperty('icon')
      
      expect(suggestion.items).toBeInstanceOf(Array)
      expect(suggestion.items.length).toBeGreaterThan(0)
    })
  })
  
  it('should have valid system prompt', async () => {
    const { SYSTEM_PROMPT_DEFAULT, APP_NAME } = await import('@/lib/config')
    
    expect(SYSTEM_PROMPT_DEFAULT).toBeDefined()
    expect(typeof SYSTEM_PROMPT_DEFAULT).toBe('string')
    expect(SYSTEM_PROMPT_DEFAULT.length).toBeGreaterThan(50)
    expect(SYSTEM_PROMPT_DEFAULT).toContain(APP_NAME)
  })
})
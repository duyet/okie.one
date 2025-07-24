#!/usr/bin/env node

/**
 * Generate a secure encryption key for Okie.one
 * This script generates a base64-encoded 32-byte key for AES-256 encryption
 */

const crypto = require('crypto')

// Generate 32 random bytes (256 bits) for AES-256
const key = crypto.randomBytes(32)

// Convert to base64 for environment variable storage
const base64Key = key.toString('base64')

console.log('Generated encryption key for ENCRYPTION_KEY environment variable:')
console.log('')
console.log(base64Key)
console.log('')
console.log('Add this to your environment variables:')
console.log(`ENCRYPTION_KEY=${base64Key}`)
console.log('')
console.log('⚠️  Store this key securely! If lost, existing user API keys cannot be decrypted.')
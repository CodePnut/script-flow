/**
 * IP Hash Utility Functions
 *
 * This module provides privacy-preserving IP address hashing functionality
 * for anonymous user tracking. It's used to associate transcripts with users
 * without storing personally identifiable information.
 *
 * Features:
 * - SHA-256 hashing for privacy protection
 * - Consistent hash generation for same IPs
 * - Support for various IP address formats
 * - Edge case handling for missing/invalid IPs
 * - TypeScript type safety
 */

import { createHash } from 'crypto'

import type { NextRequest } from 'next/server'

/**
 * Salt for IP hashing to prevent rainbow table attacks
 * In production, this should be a strong, unique value stored in environment variables
 */
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'scriptflow-default-salt-2024'

/**
 * Extract IP address from Next.js request object
 *
 * Handles various proxy configurations and header formats:
 * - x-forwarded-for (most common proxy header)
 * - x-real-ip (nginx proxy header)
 * - cf-connecting-ip (Cloudflare header)
 * - Fallback to connection remote address
 *
 * @param request - Next.js request object
 * @returns IP address string or null if not found
 */
export function extractIPAddress(request: NextRequest): string | null {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2)
  // The first IP is usually the original client IP
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0]?.trim()
    if (firstIP && isValidIP(firstIP)) {
      return firstIP
    }
  }

  // Check other proxy headers
  if (realIP && isValidIP(realIP)) {
    return realIP
  }

  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP
  }

  // No valid IP found in headers
  return null
}

/**
 * Validate IP address format
 *
 * Performs basic validation for IPv4 and IPv6 addresses
 * This is not exhaustive but catches most common invalid formats
 *
 * @param ip - IP address string to validate
 * @returns True if IP appears to be valid
 */
export function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false
  }

  // Remove whitespace
  ip = ip.trim()

  // Check for IPv4 format (basic validation)
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (ipv4Regex.test(ip)) {
    return true
  }

  // Check for IPv6 format (basic validation)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
  if (ipv6Regex.test(ip)) {
    return true
  }

  // Check for IPv6 compressed format
  const ipv6CompressedRegex =
    /^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/
  if (ipv6CompressedRegex.test(ip)) {
    return true
  }

  return false
}

/**
 * Generate SHA-256 hash for IP address
 *
 * Creates a privacy-preserving hash of the IP address using SHA-256
 * with a salt to prevent rainbow table attacks. The same IP will
 * always produce the same hash.
 *
 * @param ip - IP address to hash
 * @returns SHA-256 hash string
 */
export function hashIPAddress(ip: string): string {
  if (!ip || !isValidIP(ip)) {
    throw new Error('Invalid IP address provided for hashing')
  }

  // Normalize IP address (remove whitespace, convert to lowercase)
  const normalizedIP = ip.trim().toLowerCase()

  // Create hash with salt
  const hash = createHash('sha256')
  hash.update(IP_HASH_SALT)
  hash.update(normalizedIP)

  return hash.digest('hex')
}

/**
 * Get IP hash from Next.js request
 *
 * Convenience function that extracts IP from request and returns hash
 * Returns null if IP cannot be extracted or hashed
 *
 * @param request - Next.js request object
 * @returns IP hash string or null
 */
export function getIPHashFromRequest(request: NextRequest): string | null {
  try {
    const ip = extractIPAddress(request)
    if (!ip) {
      return null
    }

    return hashIPAddress(ip)
  } catch (error) {
    console.error('🔴 Error hashing IP address:', error)
    return null
  }
}

/**
 * Generate fallback hash for cases where IP is not available
 *
 * Uses user agent and other headers to create a semi-unique identifier
 * This is less reliable than IP but provides some tracking capability
 *
 * @param request - Next.js request object
 * @returns Fallback hash string
 */
export function getFallbackHash(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown'

  // Create a hash from available headers
  const hash = createHash('sha256')
  hash.update(IP_HASH_SALT)
  hash.update(userAgent)
  hash.update(acceptLanguage)
  hash.update(acceptEncoding)
  hash.update(Date.now().toString()) // Add timestamp for uniqueness

  return `fallback_${hash.digest('hex').substring(0, 16)}`
}

/**
 * Get user identifier from request
 *
 * Attempts to get IP hash first, falls back to header-based hash
 * This ensures we always have some form of user identification
 *
 * @param request - Next.js request object
 * @returns User identifier string
 */
export function getUserIdentifier(request: NextRequest): string {
  const ipHash = getIPHashFromRequest(request)
  if (ipHash) {
    return ipHash
  }

  // Fallback to header-based identification
  return getFallbackHash(request)
}

/**
 * Privacy-preserving analytics data
 *
 * Provides basic analytics without storing personal information
 */
export interface PrivacyAnalytics {
  userHash: string
  timestamp: Date
  isIPBased: boolean
  isFallback: boolean
}

/**
 * Generate privacy-preserving analytics data
 *
 * @param request - Next.js request object
 * @returns Analytics data object
 */
export function generatePrivacyAnalytics(
  request: NextRequest,
): PrivacyAnalytics {
  const ipHash = getIPHashFromRequest(request)

  return {
    userHash: ipHash || getFallbackHash(request),
    timestamp: new Date(),
    isIPBased: !!ipHash,
    isFallback: !ipHash,
  }
}

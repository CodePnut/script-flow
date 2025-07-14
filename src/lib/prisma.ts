/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma client to avoid
 * creating multiple connections in development and ensure proper connection
 * management in production.
 *
 * Features:
 * - Singleton pattern to prevent multiple instances
 * - Development-friendly with hot reloading support
 * - Proper error handling and logging
 * - Type-safe database operations
 * - Connection pooling optimization
 */

import { PrismaClient } from '../generated/prisma'

/**
 * Global variable to hold the Prisma client instance
 * This prevents multiple instances in development due to hot reloading
 */
declare global {
  var __prisma: PrismaClient | undefined
}

/**
 * Prisma client configuration options
 * Optimized for both development and production environments
 */
const prismaClientOptions = {
  // Enable query logging in development
  log:
    process.env.NODE_ENV === 'development'
      ? (['query', 'info', 'warn', 'error'] as const)
      : (['error'] as const),

  // Error formatting for better debugging
  errorFormat: 'pretty' as const,
} satisfies ConstructorParameters<typeof PrismaClient>[0]

/**
 * Initialize Prisma client with proper error handling
 *
 * @returns Configured Prisma client instance
 */
function createPrismaClient(): PrismaClient {
  try {
    const client = new PrismaClient(prismaClientOptions)
    return client
  } catch (error) {
    console.error('🔴 Failed to initialize Prisma Client:', error)
    throw new Error(
      'Database connection failed. Please check your DATABASE_URL.',
    )
  }
}

/**
 * Singleton Prisma client instance
 *
 * In development, we store the client on the global object to prevent
 * multiple instances due to hot reloading. In production, we create
 * a new instance.
 */
export const prisma = global.__prisma || createPrismaClient()

// Store the client globally in development
if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma
}

/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Prisma client disconnected successfully')
  } catch (error) {
    console.error('🔴 Error disconnecting Prisma client:', error)
  }
}

/**
 * Database health check utility
 * Useful for monitoring and debugging connection issues
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  try {
    const startTime = Date.now()

    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`

    const latency = Date.now() - startTime

    return {
      connected: true,
      latency,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Export Prisma types for use throughout the application
 * This ensures type safety when working with database models
 */
export type { User, Transcript } from '../generated/prisma'

/**
 * Utility type for Prisma operations
 * Provides type-safe access to all Prisma model operations
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Common Prisma include options for efficient data fetching
 * These can be reused across different queries to maintain consistency
 */
export const commonIncludes = {
  // Include user data with transcript
  transcriptWithUser: {
    user: {
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    },
  },

  // Include transcripts with user data
  userWithTranscripts: {
    transcripts: {
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 10, // Limit to recent transcripts
    },
  },
} as const

/**
 * Common Prisma select options for optimized queries
 * These help reduce data transfer and improve performance
 */
export const commonSelects = {
  // Basic transcript info (without large JSON fields)
  transcriptSummary: {
    id: true,
    videoId: true,
    title: true,
    description: true,
    language: true,
    duration: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  },

  // Basic user info (without sensitive data)
  userSummary: {
    id: true,
    email: true,
    createdAt: true,
  },
} as const

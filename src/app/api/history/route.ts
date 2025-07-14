/**
 * GET /api/history
 *
 * Fetch user transcript history with IP-based privacy-preserving tracking
 *
 * This endpoint provides paginated access to transcript history using
 * IP hash for user identification. It supports anonymous usage while
 * maintaining some level of personalization.
 *
 * Features:
 * - IP-based privacy-preserving user tracking
 * - Server-side pagination for performance
 * - Comprehensive error handling
 * - Query parameter validation
 * - CORS support for frontend integration
 * - Optimized database queries with proper indexing
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getUserIdentifier } from '@/lib/ipHash'
import { prisma } from '@/lib/prisma'

/**
 * Query parameter validation schema
 */
const historyQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 50, 'Limit must be between 1 and 50'),
})

/**
 * GET /api/history
 *
 * Fetch paginated transcript history for the current user (by IP)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = {
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    }

    const validation = historyQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues,
        },
        { status: 400 },
      )
    }

    const { page, limit } = validation.data

    // Get user identifier from request
    const userHash = getUserIdentifier(request)

    // Calculate pagination offset
    const offset = (page - 1) * limit

    // Fetch transcripts with pagination
    const [transcripts, totalCount] = await Promise.all([
      prisma.transcript.findMany({
        where: {
          ipHash: userHash,
          status: 'completed',
        },
        select: {
          id: true,
          videoId: true,
          title: true,
          description: true,
          duration: true,
          language: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.transcript.count({
        where: {
          ipHash: userHash,
          status: 'completed',
        },
      }),
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Format response data
    const formattedTranscripts = transcripts.map((transcript) => ({
      id: transcript.id,
      videoId: transcript.videoId,
      title: transcript.title,
      description: transcript.description?.slice(0, 200) || '',
      duration: transcript.duration,
      language: transcript.language,
      status: transcript.status,
      thumbnailUrl: `https://img.youtube.com/vi/${transcript.videoId}/maxresdefault.jpg`,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    }))

    return NextResponse.json({
      items: formattedTranscripts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      meta: {
        userHash: userHash.slice(0, 8) + '...', // Partial hash for debugging
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('🔴 Error fetching history:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * POST /api/history
 *
 * Add a transcript to user history (alternative to automatic tracking)
 * This can be used for manual history management if needed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcriptId } = body

    if (!transcriptId || typeof transcriptId !== 'string') {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 },
      )
    }

    // Get user identifier from request
    const userHash = getUserIdentifier(request)

    // Check if transcript exists and update IP hash if needed
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 },
      )
    }

    // Update IP hash if not set (for backward compatibility)
    if (!transcript.ipHash) {
      await prisma.transcript.update({
        where: { id: transcriptId },
        data: { ipHash: userHash },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript added to history',
    })
  } catch (error) {
    console.error('🔴 Error adding to history:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

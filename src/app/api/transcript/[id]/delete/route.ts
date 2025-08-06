/**
 * DELETE /api/transcript/[id]/delete
 *
 * Delete a transcript by ID
 *
 * This endpoint allows users to delete their own transcripts.
 * It uses IP-based identification for privacy-preserving deletion.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getUserIdentifier } from '@/lib/ipHash'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/transcript/[id]/delete
 *
 * Delete a transcript by ID (only if it belongs to the current user)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Validate transcript ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcript ID' },
        { status: 400 },
      )
    }

    // Get user identifier from request
    const userHash = getUserIdentifier(request)

    // Check if transcript exists and belongs to the user
    const transcript = await prisma.transcript.findFirst({
      where: {
        id: id,
        ipHash: userHash,
      },
      select: {
        id: true,
        title: true,
      },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found or not authorized to delete' },
        { status: 404 },
      )
    }

    // Delete the transcript
    await prisma.transcript.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Transcript "${transcript.title}" deleted successfully`,
    })
  } catch (error) {
    console.error('🔴 Error deleting transcript:', error)

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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

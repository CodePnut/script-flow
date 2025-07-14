import type { VideoData, TranscriptSegment, VideoChapter } from './transcript'
import { getThumbnailUrl } from './youtube'

/**
 * Mock video data for testing video viewer functionality
 *
 * In production, this would be replaced with real API calls
 * to fetch transcript data from Deepgram or similar services
 */

/**
 * Generate mock transcript segments for a video
 * Creates realistic timing and content for demonstration
 */
function generateMockTranscript(): TranscriptSegment[] {
  return [
    {
      id: 'seg-001',
      start: 0,
      end: 4.2,
      text: 'Welcome to this comprehensive tutorial on modern web development.',
      speaker: 'Instructor',
      confidence: 0.95,
    },
    {
      id: 'seg-002',
      start: 4.2,
      end: 8.7,
      text: "Today we'll be exploring React, TypeScript, and Next.js together.",
      speaker: 'Instructor',
      confidence: 0.92,
    },
    {
      id: 'seg-003',
      start: 8.7,
      end: 12.1,
      text: 'These technologies form the backbone of modern frontend development.',
      speaker: 'Instructor',
      confidence: 0.94,
    },
    {
      id: 'seg-004',
      start: 12.1,
      end: 16.8,
      text: "Let's start by setting up our development environment with the latest tools.",
      speaker: 'Instructor',
      confidence: 0.96,
    },
    {
      id: 'seg-005',
      start: 16.8,
      end: 21.3,
      text: 'First, we need to install Node.js version 18 or higher on our system.',
      speaker: 'Instructor',
      confidence: 0.93,
    },
    {
      id: 'seg-006',
      start: 21.3,
      end: 25.6,
      text: 'You can download it from the official Node.js website or use a version manager.',
      speaker: 'Instructor',
      confidence: 0.91,
    },
    {
      id: 'seg-007',
      start: 25.6,
      end: 30.2,
      text: 'Once Node.js is installed, we can create our Next.js project using the CLI.',
      speaker: 'Instructor',
      confidence: 0.97,
    },
    {
      id: 'seg-008',
      start: 30.2,
      end: 34.8,
      text: 'Run "npx create-next-app@latest" and follow the interactive prompts.',
      speaker: 'Instructor',
      confidence: 0.95,
    },
    {
      id: 'seg-009',
      start: 34.8,
      end: 39.1,
      text: 'Make sure to enable TypeScript, ESLint, and Tailwind CSS for best practices.',
      speaker: 'Instructor',
      confidence: 0.94,
    },
    {
      id: 'seg-010',
      start: 39.1,
      end: 43.7,
      text: 'These tools will help us write better, more maintainable code throughout our project.',
      speaker: 'Instructor',
      confidence: 0.93,
    },
    {
      id: 'seg-011',
      start: 43.7,
      end: 48.2,
      text: "Now let's explore the project structure that Next.js has created for us.",
      speaker: 'Instructor',
      confidence: 0.96,
    },
    {
      id: 'seg-012',
      start: 48.2,
      end: 52.9,
      text: 'The app directory contains our main application code using the new App Router.',
      speaker: 'Instructor',
      confidence: 0.92,
    },
    {
      id: 'seg-013',
      start: 52.9,
      end: 57.4,
      text: 'This is a significant improvement over the old Pages Router for organization.',
      speaker: 'Instructor',
      confidence: 0.94,
    },
    {
      id: 'seg-014',
      start: 57.4,
      end: 62.1,
      text: 'Components should be placed in a dedicated components folder for reusability.',
      speaker: 'Instructor',
      confidence: 0.95,
    },
    {
      id: 'seg-015',
      start: 62.1,
      end: 66.8,
      text: "Let's create our first component and see how TypeScript helps with type safety.",
      speaker: 'Instructor',
      confidence: 0.97,
    },
  ]
}

/**
 * Generate mock chapters for video navigation
 */
function generateMockChapters(): VideoChapter[] {
  return [
    {
      id: 'chapter-001',
      title: 'Introduction',
      start: 0,
      end: 12.1,
      description: "Welcome and overview of what we'll learn",
    },
    {
      id: 'chapter-002',
      title: 'Environment Setup',
      start: 12.1,
      end: 30.2,
      description: 'Installing Node.js and development tools',
    },
    {
      id: 'chapter-003',
      title: 'Creating the Project',
      start: 30.2,
      end: 43.7,
      description: 'Using Next.js CLI and configuring options',
    },
    {
      id: 'chapter-004',
      title: 'Project Structure',
      start: 43.7,
      end: 62.1,
      description: 'Understanding Next.js App Router and organization',
    },
    {
      id: 'chapter-005',
      title: 'Building Components',
      start: 62.1,
      end: 66.8,
      description: 'Creating reusable TypeScript components',
    },
  ]
}

/**
 * Mock video database - simulates API responses
 * In production, this would come from a real database or API
 */
export const mockVideoDatabase: Record<string, VideoData> = {
  dQw4w9WgXcQ: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Modern Web Development with React & Next.js',
    description:
      'A comprehensive tutorial covering React, TypeScript, and Next.js development best practices.',
    duration: 66.8,
    thumbnailUrl: getThumbnailUrl('dQw4w9WgXcQ'),
    transcript: generateMockTranscript(),
    summary:
      'This tutorial provides a complete introduction to modern web development using React, TypeScript, and Next.js. We start by setting up the development environment, including Node.js installation and project creation. The course covers the new Next.js App Router, project organization, and TypeScript integration for better code quality and developer experience.',
    chapters: generateMockChapters(),
    metadata: {
      language: 'en',
      generatedAt: new Date('2024-01-15T10:30:00Z'),
      source: 'mock',
    },
  },
  jNQXAC9IVRw: {
    videoId: 'jNQXAC9IVRw',
    title: 'Advanced React Patterns and Best Practices',
    description:
      'Deep dive into advanced React patterns, hooks, and performance optimization techniques.',
    duration: 180.5,
    thumbnailUrl: getThumbnailUrl('jNQXAC9IVRw'),
    transcript: [
      {
        id: 'seg-adv-001',
        start: 0,
        end: 5.2,
        text: "In this advanced React tutorial, we'll explore sophisticated patterns and techniques.",
        speaker: 'Expert',
        confidence: 0.96,
      },
      {
        id: 'seg-adv-002',
        start: 5.2,
        end: 10.8,
        text: "We'll start with custom hooks and move on to compound components and render props.",
        speaker: 'Expert',
        confidence: 0.94,
      },
      {
        id: 'seg-adv-003',
        start: 10.8,
        end: 16.1,
        text: 'These patterns will help you build more reusable and maintainable React applications.',
        speaker: 'Expert',
        confidence: 0.95,
      },
    ],
    summary:
      'An in-depth exploration of advanced React development patterns including custom hooks, compound components, render props, and performance optimization strategies. Perfect for developers looking to elevate their React skills.',
    chapters: [
      {
        id: 'adv-chapter-001',
        title: 'Custom Hooks',
        start: 0,
        end: 60,
        description: 'Building reusable stateful logic',
      },
      {
        id: 'adv-chapter-002',
        title: 'Component Patterns',
        start: 60,
        end: 120,
        description: 'Compound components and render props',
      },
      {
        id: 'adv-chapter-003',
        title: 'Performance',
        start: 120,
        end: 180.5,
        description: 'Optimization techniques and best practices',
      },
    ],
    metadata: {
      language: 'en',
      generatedAt: new Date('2024-01-20T14:15:00Z'),
      source: 'mock',
    },
  },
}

/**
 * Fetch mock video data by video ID
 * Simulates an API call with realistic delay
 *
 * @param videoId - YouTube video ID
 * @returns Promise resolving to video data or null if not found
 */
export async function fetchMockVideoData(
  videoId: string,
): Promise<VideoData | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const videoData = mockVideoDatabase[videoId]

  if (!videoData) {
    return null
  }

  // Deep clone to avoid mutations
  const clonedData = JSON.parse(JSON.stringify(videoData))

  // Convert generatedAt back to Date object after JSON deserialization
  clonedData.metadata.generatedAt = new Date(clonedData.metadata.generatedAt)

  return clonedData
}

/**
 * Check if video exists in mock database
 * @param videoId - YouTube video ID to check
 * @returns boolean indicating if video exists
 */
export function mockVideoExists(videoId: string): boolean {
  return videoId in mockVideoDatabase
}

/**
 * Get available mock video IDs for testing
 * @returns Array of available video IDs
 */
export function getMockVideoIds(): string[] {
  return Object.keys(mockVideoDatabase)
}

'use client'

import { useEffect, useState } from 'react'

import { useTheme } from './ThemeProvider'

/**
 * Geometric shape configuration for the particle background system
 * Each shape has unique properties for diverse visual effects
 */
type GeometricShape = {
  id: number // Unique identifier for animation class mapping
  type: 'circle' | 'square' | 'triangle' | 'hexagon' // Shape geometry
  size: number // Size in pixels (35-125px range)
  left: number // Horizontal position (0-100%)
  top: number // Vertical position (0-100%)
  animationDelay: number // Staggered start time (0-6s)
  animationDuration: number // Animation cycle length (20-45s)
  rotationSpeed: number // Rotation timing (25-105s)
  opacity: number // Transparency level (0.08-0.28)
}

// Configuration constants for maintainability and performance
const PARTICLE_CONFIG = {
  SHAPE_COUNT: 12,
  SHAPE_SIZE_RANGE: { min: 35, max: 125 },
  ANIMATION_DELAY_RANGE: { min: 0, max: 6 },
  ANIMATION_DURATION_RANGE: { min: 20, max: 45 },
  ROTATION_SPEED_RANGE: { min: 25, max: 105 },
  OPACITY_RANGE: { min: 0.08, max: 0.28 },
} as const

/**
 * ParticleBackground Component
 *
 * Creates an animated geometric background with:
 * - 12 floating shapes with unique animations
 * - Responsive to theme changes (light/dark)
 * - Accessibility support (reduced motion)
 * - Layered gradient effects for depth
 * - Optimized performance with client-side rendering
 */
export function ParticleBackground() {
  const { resolvedTheme } = useTheme()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [shapes, setShapes] = useState<GeometricShape[]>([])

  // Initialize shapes and accessibility preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    // Generate geometric shapes client-side only to avoid hydration mismatch
    setIsMounted(true)
    const shapeTypes: GeometricShape['type'][] = [
      'circle',
      'square',
      'triangle',
      'hexagon',
    ]

    // Generate shapes with randomized properties for visual diversity
    setShapes(
      Array.from({ length: PARTICLE_CONFIG.SHAPE_COUNT }, (_, i) => ({
        id: i,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        size:
          Math.random() *
            (PARTICLE_CONFIG.SHAPE_SIZE_RANGE.max -
              PARTICLE_CONFIG.SHAPE_SIZE_RANGE.min) +
          PARTICLE_CONFIG.SHAPE_SIZE_RANGE.min,
        left: Math.random() * 100,
        top: Math.random() * 100,
        animationDelay:
          Math.random() *
            (PARTICLE_CONFIG.ANIMATION_DELAY_RANGE.max -
              PARTICLE_CONFIG.ANIMATION_DELAY_RANGE.min) +
          PARTICLE_CONFIG.ANIMATION_DELAY_RANGE.min,
        animationDuration:
          Math.random() *
            (PARTICLE_CONFIG.ANIMATION_DURATION_RANGE.max -
              PARTICLE_CONFIG.ANIMATION_DURATION_RANGE.min) +
          PARTICLE_CONFIG.ANIMATION_DURATION_RANGE.min,
        rotationSpeed:
          Math.random() *
            (PARTICLE_CONFIG.ROTATION_SPEED_RANGE.max -
              PARTICLE_CONFIG.ROTATION_SPEED_RANGE.min) +
          PARTICLE_CONFIG.ROTATION_SPEED_RANGE.min,
        opacity:
          Math.random() *
            (PARTICLE_CONFIG.OPACITY_RANGE.max -
              PARTICLE_CONFIG.OPACITY_RANGE.min) +
          PARTICLE_CONFIG.OPACITY_RANGE.min,
      })),
    )

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Accessibility: Static background for users who prefer reduced motion
  // Note: Using hardcoded rgba values in inline styles for maximum browser compatibility
  // while maintaining standardized colors in Tailwind utilities
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            resolvedTheme === 'dark'
              ? `
                linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(34, 197, 94, 0.08) 100%),
                radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.05) 0%, transparent 50%)
              `
              : `
                linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(147, 51, 234, 0.12) 50%, rgba(34, 197, 94, 0.12) 100%),
                linear-gradient(45deg, rgba(168, 85, 247, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%),
                radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.06) 0%, transparent 60%),
                radial-gradient(circle at 70% 60%, rgba(34, 197, 94, 0.06) 0%, transparent 60%)
              `,
        }}
      />
    )
  }

  // Main animated background with geometric shapes and ambient lighting
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Primary gradient layer - provides base color foundation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            resolvedTheme === 'dark'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(147, 51, 234, 0.12) 50%, rgba(34, 197, 94, 0.12) 100%)'
              : `
                linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(34, 197, 94, 0.15) 100%),
                linear-gradient(45deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%),
                linear-gradient(225deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)
              `,
        }}
      />

      {/* Animated geometric shapes container */}
      <div className="relative h-full w-full">
        {/* Render animated shapes only when mounted and motion is enabled */}
        {isMounted &&
          !prefersReducedMotion &&
          shapes.map((shape) => (
            <div
              key={shape.id}
              className={`absolute geometric-shape-${shape.id} ${
                resolvedTheme === 'dark'
                  ? 'bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-green-400/30'
                  : 'bg-gradient-to-br from-blue-600/40 via-purple-600/40 to-green-600/40'
              }`}
              style={{
                // Shape dimensions and positioning
                width: `${shape.size}px`,
                height: `${shape.size}px`,
                left: `${shape.left}%`,
                top: `${shape.top}%`,
                opacity: shape.opacity,
                // Shape-specific styling
                borderRadius:
                  shape.type === 'circle'
                    ? '50%' // Perfect circle
                    : shape.type === 'square'
                      ? '8px' // Rounded square
                      : shape.type === 'hexagon'
                        ? '12px' // Slightly rounded hexagon
                        : '0%', // Sharp triangle
                // Custom shapes using clip-path
                clipPath:
                  shape.type === 'triangle'
                    ? 'polygon(50% 0%, 0% 100%, 100% 100%)' // Upward triangle
                    : shape.type === 'hexagon'
                      ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' // Regular hexagon
                      : 'none',
                // Animation timing
                animationDelay: `${shape.animationDelay}s`,
              }}
            />
          ))}
      </div>

      {/* Ambient lighting effects - creates depth and atmosphere */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            resolvedTheme === 'dark'
              ? `
                radial-gradient(600px circle at 20% 20%, rgba(59, 130, 246, 0.2), transparent 40%),
                radial-gradient(800px circle at 80% 80%, rgba(147, 51, 234, 0.2), transparent 40%),
                radial-gradient(400px circle at 60% 40%, rgba(34, 197, 94, 0.15), transparent 40%)
              `
              : `
                radial-gradient(600px circle at 20% 20%, rgba(59, 130, 246, 0.18), transparent 40%),
                radial-gradient(800px circle at 80% 80%, rgba(147, 51, 234, 0.18), transparent 40%),
                radial-gradient(400px circle at 60% 40%, rgba(34, 197, 94, 0.12), transparent 40%),
                radial-gradient(500px circle at 10% 90%, rgba(168, 85, 247, 0.1), transparent 50%),
                radial-gradient(700px circle at 90% 10%, rgba(236, 72, 153, 0.08), transparent 50%)
              `,
        }}
      />
    </div>
  )
}

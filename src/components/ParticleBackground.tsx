'use client'

import { useEffect, useState } from 'react'

import { useTheme } from './ThemeProvider'

type GeometricShape = {
  id: number
  type: 'circle' | 'square' | 'triangle' | 'hexagon'
  size: number
  left: number
  top: number
  animationDelay: number
  animationDuration: number
  rotationSpeed: number
  opacity: number
}

export function ParticleBackground() {
  const { resolvedTheme } = useTheme()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [shapes, setShapes] = useState<GeometricShape[]>([])

  // Check for reduced motion preference and generate shapes
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

    setShapes(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        size: Math.random() * 80 + 40, // 40-120px
        left: Math.random() * 100,
        top: Math.random() * 100,
        animationDelay: Math.random() * 4,
        animationDuration: Math.random() * 20 + 15, // 15-35s for slow, smooth movement
        rotationSpeed: Math.random() * 60 + 30, // 30-90s rotation
        opacity: Math.random() * 0.15 + 0.05, // 0.05-0.2 opacity
      })),
    )

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  if (prefersReducedMotion) {
    // Render a subtle static background for reduced motion
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            resolvedTheme === 'dark'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(34, 197, 94, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(147, 51, 234, 0.03) 50%, rgba(34, 197, 94, 0.03) 100%)',
        }}
      />
    )
  }

  // Modern geometric background with sophisticated animations
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            resolvedTheme === 'dark'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(34, 197, 94, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(147, 51, 234, 0.04) 50%, rgba(34, 197, 94, 0.04) 100%)',
        }}
      />

      {/* Floating geometric shapes */}
      <div className="relative h-full w-full">
        {isMounted &&
          !prefersReducedMotion &&
          shapes.map((shape) => (
            <div
              key={shape.id}
              className={`absolute geometric-shape-${shape.id} ${
                resolvedTheme === 'dark'
                  ? 'bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-green-400/20'
                  : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-green-500/10'
              }`}
              style={{
                width: `${shape.size}px`,
                height: `${shape.size}px`,
                left: `${shape.left}%`,
                top: `${shape.top}%`,
                opacity: shape.opacity,
                borderRadius:
                  shape.type === 'circle'
                    ? '50%'
                    : shape.type === 'square'
                      ? '8px'
                      : shape.type === 'hexagon'
                        ? '12px'
                        : '0%',
                clipPath:
                  shape.type === 'triangle'
                    ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                    : shape.type === 'hexagon'
                      ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                      : 'none',
                animationDelay: `${shape.animationDelay}s`,
              }}
            />
          ))}
      </div>

      {/* Additional ambient lighting effects */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            resolvedTheme === 'dark'
              ? `
                radial-gradient(600px circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 40%),
                radial-gradient(800px circle at 80% 80%, rgba(147, 51, 234, 0.15), transparent 40%),
                radial-gradient(400px circle at 60% 40%, rgba(34, 197, 94, 0.1), transparent 40%)
              `
              : `
                radial-gradient(600px circle at 20% 20%, rgba(59, 130, 246, 0.08), transparent 40%),
                radial-gradient(800px circle at 80% 80%, rgba(147, 51, 234, 0.08), transparent 40%),
                radial-gradient(400px circle at 60% 40%, rgba(34, 197, 94, 0.05), transparent 40%)
              `,
        }}
      />
    </div>
  )
}

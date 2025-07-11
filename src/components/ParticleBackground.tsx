'use client'

import { useEffect, useState } from 'react'

import { useTheme } from './ThemeProvider'

export function ParticleBackground() {
  const { resolvedTheme } = useTheme()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [particles, setParticles] = useState<
    Array<{
      id: number
      width: number
      height: number
      left: number
      top: number
      animationDelay: number
      animationDuration: number
    }>
  >([])

  // Check for reduced motion preference and generate particles
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    // Generate particles client-side only to avoid hydration mismatch
    setIsMounted(true)
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        width: Math.random() * 4 + 2,
        height: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        animationDelay: Math.random() * 2,
        animationDuration: Math.random() * 3 + 2,
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
              ? 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%)',
        }}
      />
    )
  }

  // Animated geometric background with CSS
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            resolvedTheme === 'dark'
              ? 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Floating particles with CSS animation */}
      <div className="relative h-full w-full">
        {isMounted &&
          particles.map((particle) => (
            <div
              key={particle.id}
              className={`absolute rounded-full animate-pulse ${
                resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-black/5'
              }`}
              style={{
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`,
              }}
            />
          ))}
      </div>
    </div>
  )
}

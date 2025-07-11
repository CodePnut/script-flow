'use client'

import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * ProgressBar component props interface
 */
interface ProgressBarProps {
  /** Progress value between 0 and 100 */
  progress: number
  /** Optional custom className for styling */
  className?: string
  /** Progress bar size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional label to display above progress bar */
  label?: string
  /** Whether to show percentage text */
  showPercentage?: boolean
  /** Color variant for the progress bar */
  variant?: 'primary' | 'secondary' | 'accent'
}

/**
 * Animated Progress Bar Component
 *
 * Features:
 * - Smooth progress animations using Framer Motion
 * - Consistent styling with design system
 * - Multiple size variants
 * - Accessible with proper ARIA attributes
 * - Optional label and percentage display
 * - Color variants matching theme system
 */
export function ProgressBar({
  progress,
  className,
  size = 'md',
  label,
  showPercentage = true,
  variant = 'primary',
}: ProgressBarProps) {
  // Ensure progress is within valid range
  const clampedProgress = Math.max(0, Math.min(100, progress))

  // Size variants for consistent spacing
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  // Color variants matching the theme system
  const variantClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Label and percentage row */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-fg">{label}</span>}
          {showPercentage && (
            <span className="text-fg/70 font-mono text-xs">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-secondary',
          sizeClasses[size],
        )}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        {/* Animated progress fill */}
        <motion.div
          className={cn(
            'h-full rounded-full transition-colors',
            variantClasses[variant],
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1], // Custom easing for smooth animation
          }}
        />

        {/* Subtle shimmer effect during progress */}
        {clampedProgress > 0 && clampedProgress < 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }}
          />
        )}
      </div>

      {/* Completion indicator */}
      {clampedProgress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center text-primary"
        >
          <span className="text-sm font-medium">Completed!</span>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Progress Bar variants for common use cases
 */
export const ProgressBarVariants = {
  /** Small progress bar for compact spaces */
  Small: (props: Omit<ProgressBarProps, 'size'>) => (
    <ProgressBar {...props} size="sm" />
  ),

  /** Large progress bar for prominent display */
  Large: (props: Omit<ProgressBarProps, 'size'>) => (
    <ProgressBar {...props} size="lg" />
  ),

  /** Progress bar with transcription-specific styling */
  Transcription: (props: Omit<ProgressBarProps, 'label' | 'variant'>) => (
    <ProgressBar {...props} label="Transcribing video..." variant="primary" />
  ),
}

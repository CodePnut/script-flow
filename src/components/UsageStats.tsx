'use client'

import { motion } from 'framer-motion'
import { Activity, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useHistoryStore } from '@/hooks/useHistoryStore'
import { cn, formatDate } from '@/lib/utils'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'

/**
 * UsageStats component props
 */
interface UsageStatsProps {
  className?: string
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * UsageStats Component
 *
 * Displays API usage statistics and quotas
 *
 * Features:
 * - Usage progress bar with percentage
 * - Statistics cards showing transcription metrics
 * - Animated progress indicators
 * - Responsive layout
 */
export function UsageStats({ className }: UsageStatsProps) {
  const { getHistoryStats } = useHistoryStore()
  const stats = getHistoryStats()

  // Avoid hydration mismatches by rendering stable values on first client paint
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Plan model - simple free tier (50 tokens/month), 1 token per video
  const plan = useMemo(
    () => ({
      name: 'Free',
      monthlyTokenAllowance: 50,
      tokenPerVideo: 1,
      renewsEvery: 'month',
    }),
    [],
  )

  // Calculate dynamic usage
  const usage = useMemo(() => {
    const totalVideos = mounted ? stats.totalVideos : 0
    const tokensUsed = Math.min(totalVideos * plan.tokenPerVideo, 9999)
    const tokensTotal = plan.monthlyTokenAllowance
    const percentage = Math.min(
      Math.round((tokensUsed / tokensTotal) * 100),
      100,
    )

    return {
      tokensUsed,
      tokensTotal,
      percentage,
      tokensRemaining: Math.max(tokensTotal - tokensUsed, 0),
    }
  }, [mounted, stats.totalVideos, plan])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Usage (Free plan)
          </CardTitle>
          <CardDescription>
            1 token per video • {plan.monthlyTokenAllowance} tokens/
            {plan.renewsEvery}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Usage Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tokens used</span>
                <span className="font-medium">
                  {usage.tokensUsed} / {usage.tokensTotal}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usage.percentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-primary h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-muted-fg">
                {usage.percentage}% of your monthly quota used
              </p>
            </div>

            {/* Remaining Credits */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Remaining tokens</span>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {usage.tokensRemaining}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Videos */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm font-medium">Total Videos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalVideos}</p>
            <p className="text-xs text-muted-fg">
              {stats.totalVideos === 1 ? 'video' : 'videos'} transcribed
            </p>
          </CardContent>
        </Card>

        {/* Total Duration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Total Duration</span>
            </div>
            <p className="text-2xl font-bold">
              {formatDuration(stats.totalDuration)}
            </p>
            <p className="text-xs text-muted-fg">content processed</p>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Status</span>
            </div>
            <p className="text-2xl font-bold">
              {usage.tokensRemaining > 0 ? 'Active' : 'Limit reached'}
            </p>
            <p className="text-xs text-muted-fg">
              Resets every {plan.renewsEvery}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Timeline */}
      {stats.totalVideos > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Timeline</CardTitle>
            <CardDescription>
              Your transcription activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>First video</span>
                <span className="text-muted-fg">
                  {stats.oldestVideo ? formatDate(stats.oldestVideo) : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Latest video</span>
                <span className="text-muted-fg">
                  {stats.newestVideo ? formatDate(stats.newestVideo) : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Active days</span>
                <span className="text-muted-fg">
                  {stats.oldestVideo && stats.newestVideo
                    ? Math.ceil(
                        (stats.newestVideo.getTime() -
                          stats.oldestVideo.getTime()) /
                          (1000 * 60 * 60 * 24),
                      ) + 1
                    : 1}{' '}
                  days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

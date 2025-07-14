'use client'

import { motion } from 'framer-motion'
import { Settings, Palette, Zap, Shield } from 'lucide-react'

import { DataExporter } from '@/components/DataExporter'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { UsageStats } from '@/components/UsageStats'

// Note: Metadata export is removed since this is now a client component
// TODO: Move metadata to a parent server component if needed

/**
 * Settings Page Component
 *
 * User preferences and configuration panel
 *
 * Features:
 * - Theme toggle with immediate preview
 * - API usage statistics and quotas
 * - Data export and management
 * - App preferences (auto-play, reduced motion)
 * - Smooth page transitions
 */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-fg">
                Manage your preferences and account settings
              </p>
            </div>
          </div>
        </motion.div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Theme & Preferences */}
          <div className="lg:col-span-1 space-y-6">
            {/* Theme Settings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize the look and feel of the app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="theme-toggle">Theme</Label>
                        <p className="text-sm text-muted-fg">
                          Switch between light and dark themes
                        </p>
                      </div>
                      <ThemeSwitcher />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* App Preferences */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your app experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto-play">Auto-play videos</Label>
                        <p className="text-sm text-muted-fg">
                          Automatically start playback when viewing transcripts
                        </p>
                      </div>
                      <Switch id="auto-play" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="reduced-motion">Reduced motion</Label>
                        <p className="text-sm text-muted-fg">
                          Minimize animations and transitions
                        </p>
                      </div>
                      <Switch id="reduced-motion" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="notifications">Notifications</Label>
                        <p className="text-sm text-muted-fg">
                          Receive updates about transcription progress
                        </p>
                      </div>
                      <Switch id="notifications" defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    About
                  </CardTitle>
                  <CardDescription>App information and credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Version</span>
                      <span className="text-muted-fg">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last updated</span>
                      <span className="text-muted-fg">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-muted-fg">
                        Built with Next.js, TypeScript, and Deepgram
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Usage & Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Statistics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <UsageStats />
            </motion.div>

            {/* Data Management */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <DataExporter />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

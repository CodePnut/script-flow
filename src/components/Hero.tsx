'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'

const words = ['Transcribe', 'Summarise', 'Navigate']

export function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    const currentWord = words[currentWordIndex]
    let timeoutId: NodeJS.Timeout

    if (isTyping) {
      // Typing animation
      if (displayedText.length < currentWord.length) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentWord.slice(0, displayedText.length + 1))
        }, 100)
      } else {
        // Pause before starting to delete
        timeoutId = setTimeout(() => {
          setIsTyping(false)
        }, 2000)
      }
    } else {
      // Deleting animation
      if (displayedText.length > 0) {
        timeoutId = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, 50)
      } else {
        // Move to next word
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        setIsTyping(true)
      }
    }

    return () => clearTimeout(timeoutId)
  }, [displayedText, isTyping, currentWordIndex])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-transparent via-bg/30 to-bg py-32 md:py-48">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main headline with typewriter effect */}
          <motion.h1
            className="mb-6 text-4xl font-bold tracking-tight text-fg md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-primary">{displayedText}</span>
            <motion.span
              className="inline-block w-1 bg-primary ml-1"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              |
            </motion.span>
            <br />
            <span className="text-fg">YouTube Videos</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mb-8 text-lg text-fg/80 md:text-xl lg:text-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Transform any YouTube video into interactive, searchable transcripts
            with AI-powered summaries and chapter navigation.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6 font-semibold"
            >
              <Link href="/transcribe">Get Started</Link>
            </Button>
          </motion.div>

          {/* Supporting text */}
          <motion.p
            className="mt-6 text-sm text-fg/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            No sign-up required • Free to use • Powered by AI
          </motion.p>
        </div>
      </div>
    </section>
  )
}

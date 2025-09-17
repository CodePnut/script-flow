'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// YouTube URL validation schema
const formSchema = z.object({
  url: z
    .string()
    .min(1, 'Please enter a YouTube URL')
    .refine((url) => {
      // YouTube URL patterns - more flexible
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}/
      return youtubeRegex.test(url)
    }, 'Please enter a valid YouTube URL'),
})

interface URLFormProps {
  onSubmit?: (url: string) => void
  className?: string
}

export function URLForm({ onSubmit, className }: URLFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
    },
    mode: 'onSubmit',
  })

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    console.log('Form submitted with values:', values)
    setIsLoading(true)

    try {
      // Add slight delay for user experience
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (onSubmit) {
        onSubmit(values.url)
      } else {
        // Default behavior - navigate to transcribe page
        window.location.href = `/transcribe?url=${encodeURIComponent(values.url)}`
      }
    } catch (error) {
      console.error('Error submitting URL:', error)
      toast.error('❌ Submission failed', {
        description: 'Please try again or check your connection.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit, (errors) => {
            console.log('Form validation errors:', errors)
          })}
          onInvalid={(e) => {
            console.log('Form invalid event:', e)
          }}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-medium text-fg">
                  YouTube URL
                </FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 text-lg py-6 border-accent/20 focus:border-accent"
                      disabled={isLoading}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="px-8 py-6 text-lg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Transcribe'}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription className="text-base text-fg/60">
                  Enter a YouTube video URL to generate an interactive
                  transcript
                </FormDescription>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </motion.div>
  )
}

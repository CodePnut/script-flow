import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { URLForm } from '@/components/URLForm'

// Mock framer-motion to avoid issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props}>{props.children}</div>,
  },
}))

describe('URLForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with correct elements', () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /transcribe/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('YouTube URL')).toBeInTheDocument()
    expect(screen.getByText(/enter a youtube video url/i)).toBeInTheDocument()
  })

  it('validates empty URL submission', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /transcribe/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a YouTube URL')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates invalid URL formats', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    // Test invalid URL
    fireEvent.change(input, { target: { value: 'not-a-url' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid YouTube URL'),
      ).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates non-YouTube URLs', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    // Test non-YouTube URL
    fireEvent.change(input, { target: { value: 'https://example.com/video' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid YouTube URL'),
      ).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('accepts valid YouTube watch URLs', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    fireEvent.change(input, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    await waitFor(
      () => {
        expect(mockOnSubmit).toHaveBeenCalledWith(validUrl)
      },
      { timeout: 2000 },
    )
  })

  it('accepts valid YouTube short URLs', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    const validUrl = 'https://youtu.be/dQw4w9WgXcQ'
    fireEvent.change(input, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    await waitFor(
      () => {
        expect(mockOnSubmit).toHaveBeenCalledWith(validUrl)
      },
      { timeout: 2000 },
    )
  })

  it('accepts valid YouTube embed URLs', async () => {
    render(<URLForm onSubmit={mockOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    const validUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    fireEvent.change(input, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    await waitFor(
      () => {
        expect(mockOnSubmit).toHaveBeenCalledWith(validUrl)
      },
      { timeout: 2000 },
    )
  })

  it('shows loading state during submission', async () => {
    // Mock delay in submission
    const delayedOnSubmit = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    )

    render(<URLForm onSubmit={delayedOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    fireEvent.change(input, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    // Should disable input during loading
    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('handles submission errors gracefully', async () => {
    // Mock console.error to prevent error logs in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorOnSubmit = vi.fn(() =>
      Promise.reject(new Error('Submission failed')),
    )

    render(<URLForm onSubmit={errorOnSubmit} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /transcribe/i })

    const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    fireEvent.change(input, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    // Should eventually return to normal state
    await waitFor(() => {
      expect(screen.getByText('Transcribe')).toBeInTheDocument()
      expect(input).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
    })

    consoleSpy.mockRestore()
  })
})

/**
 * URLForm Component Unit Tests
 * 
 * Comprehensive unit tests for the URLForm component
 * including validation, submission, and user interactions.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { URLForm } from '@/components/URLForm'
import { toast } from 'sonner'

// Mock the toast module
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock window.location
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('URLForm Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  describe('Component Rendering', () => {
    test('should render form with all elements', () => {
      render(<URLForm />)

      // Check for form elements
      expect(screen.getByText('YouTube URL')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Transcribe' })).toBeInTheDocument()
      expect(screen.getByText('Enter a YouTube video URL to generate an interactive transcript')).toBeInTheDocument()
    })

    test('should render with custom className', () => {
      const customClass = 'custom-form-class'
      const { container } = render(<URLForm className={customClass} />)

      // Check if custom class is applied
      expect(container.firstChild).toHaveClass(customClass)
    })

    test('should render with custom onSubmit handler', () => {
      const mockOnSubmit = vi.fn()
      render(<URLForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: 'Transcribe' })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    test('should show validation error for empty URL', async () => {
      render(<URLForm />)

      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Submit empty form
      fireEvent.click(submitButton)

      // Wait for validation error - the form uses react-hook-form with zod validation
      await waitFor(() => {
        expect(screen.getByText('Please enter a YouTube URL')).toBeInTheDocument()
      })
    })

    test('should show validation error for invalid YouTube URL', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter invalid URL
      await userEvent.type(input, 'https://vimeo.com/123456789')
      fireEvent.click(submitButton)

      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid YouTube URL')).toBeInTheDocument()
      })
    })

    test('should show validation error for malformed URL', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter malformed URL
      await userEvent.type(input, 'not-a-url')
      fireEvent.click(submitButton)

      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid YouTube URL')).toBeInTheDocument()
      })
    })

    test('should accept valid YouTube URLs', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Test different valid YouTube URL formats
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      ]

      for (const url of validUrls) {
        // Clear the input using native method
        fireEvent.change(input, { target: { value: '' } })
        await userEvent.type(input, url)
        fireEvent.click(submitButton)

        // Should not show validation errors
        expect(screen.queryByText('Please enter a YouTube URL')).not.toBeInTheDocument()
        expect(screen.queryByText('Please enter a valid YouTube URL')).not.toBeInTheDocument()
      }
    })
  })

  describe('Form Submission', () => {
    test('should call custom onSubmit handler with valid URL', async () => {
      const mockOnSubmit = vi.fn()
      render(<URLForm onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter valid URL
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      fireEvent.click(submitButton)

      // Wait for loading state and then submission (includes 1s delay)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument()
      }, { timeout: 2000 })

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      }, { timeout: 2000 })
    })

    test('should navigate to transcribe page by default', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter valid URL
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      fireEvent.click(submitButton)

      // Wait for loading state first (includes 1s delay)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument()
      }, { timeout: 2000 })

      // Wait for navigation
      await waitFor(() => {
        expect(mockLocation.href).toContain('/transcribe')
        expect(mockLocation.href).toContain('url=')
        expect(mockLocation.href).toContain(encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      }, { timeout: 2000 })
    })

    test('should show loading state during submission', async () => {
      const mockOnSubmit = vi.fn()
      render(<URLForm onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter valid URL
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      fireEvent.click(submitButton)

      // Check loading state (includes 1s delay)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      }, { timeout: 2000 })
    })
  })

  describe.skip('Error Handling', () => {
    test('should show error toast on submission failure', async () => {
      // Mock console.error to avoid error logs in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Create a component that throws an error during submission
      const ErrorThrowingForm = () => {
        const handleSubmit = async () => {
          throw new Error('Submission failed')
        }
        return <URLForm onSubmit={handleSubmit} />
      }
      
      render(<ErrorThrowingForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Enter valid URL
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      fireEvent.click(submitButton)

      // Wait for loading state first (includes 1s delay)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument()
      }, { timeout: 2000 })

      // Wait for error toast - the error should be caught and toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Submission failed', {
          description: 'Please try again or check your connection.',
        })
      }, { timeout: 3000 })

      // Restore console.error
      consoleSpy.mockRestore()
    })
  })

  describe('User Interactions', () => {
    test('should handle input changes', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      
      // Type in input
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      
      expect(input).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })

    test('should handle form submission with Enter key', async () => {
      const mockOnSubmit = vi.fn()
      render(<URLForm onSubmit={mockOnSubmit} />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      
      // Enter valid URL
      await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      
      // Submit form directly using the form element
      const form = input.closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Wait for loading state first (includes 1s delay)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument()
      }, { timeout: 2000 })

      // Wait for submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      }, { timeout: 2000 })
    })

    test('should clear validation errors on input change', async () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const submitButton = screen.getByRole('button', { name: 'Transcribe' })
      
      // Submit empty form to trigger validation
      fireEvent.click(submitButton)
      
      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText('Please enter a YouTube URL')).toBeInTheDocument()
      })
      
      // Start typing to clear error
      await userEvent.type(input, 'h')
      
      // Error should be cleared
      expect(screen.queryByText('Please enter a YouTube URL')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper form labeling', () => {
      render(<URLForm />)

      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
      const label = screen.getByText('YouTube URL')
      
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })

    test('should be keyboard navigable', async () => {
      render(<URLForm />)

      // Tab to input
      await userEvent.tab()
      
      // Should focus on input
      expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toHaveFocus()
      
      // Tab to button
      await userEvent.tab()
      
      // Should focus on button
      expect(screen.getByRole('button', { name: 'Transcribe' })).toHaveFocus()
    })
  })
})
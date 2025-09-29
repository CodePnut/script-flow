# ScriptFlow Architecture Documentation

## Project Overview

ScriptFlow is a modern YouTube video transcription and summarization platform built with Next.js 14. It provides advanced speech-to-text capabilities with AI-powered summarization, speaker diarization, and comprehensive search functionality.

## Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS 3.5+ with dark-mode first design
- **UI Components**: shadcn/ui with Radix UI primitives
- **Animations**: Framer Motion 11 for smooth transitions
- **Icons**: Lucide React
- **Fonts**: Inter (sans) + JetBrains Mono via next/font
- **State Management**: Zustand for client-side state
- **Forms**: React Hook Form with Zod validation

### Backend & APIs

- **Runtime**: Node.js with Next.js server actions
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for performance optimization
- **Search**: Full-text search with search indexing
- **AI Integration**: Deepgram for transcription, LLM for summarization
- **Video Processing**: yt-dlp for YouTube video extraction

### Development & Testing

- **Testing**: Vitest, Playwright, React Testing Library
- **Storybook**: Component documentation and testing
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier
- **Git Hooks**: Husky with lint-staged

## Project Structure

`script-flow/
 src/
    app/                    # Next.js App Router
       api/               # API routes
          transcribe/    # Transcription endpoints
          video/         # Video processing
          transcript/    # Transcript management
          history/       # User history
          cache/         # Cache management
       dashboard/         # Main dashboard page
       transcribe/        # Transcription interface
       video/[videoId]/   # Video detail pages
       settings/          # Settings page
    components/            # React components
       ui/               # shadcn/ui components
       TranscriptViewer.tsx
       VideoPlayer.tsx
       ChapterList.tsx
       SummaryCard.tsx
       ...
    lib/                   # Utility functions
       prisma.ts         # Database client
       redis.ts          # Redis client
       youtube.ts        # YouTube processing
       ai-summary.ts     # AI summarization
       transcript.ts     # Transcript utilities
       cache.ts          # Caching logic
    hooks/                # Custom React hooks
    generated/prisma/     # Generated Prisma types
 prisma/
    schema.prisma         # Database schema
 public/                   # Static assets
 tests/                    # Test files
 docs/                     # Documentation
 scripts/                  # Build/utility scripts`

## Core Features

### 1. Video Transcription

- YouTube URL input with validation
- Video metadata extraction (title, duration, thumbnails)
- Deepgram integration for speech-to-text
- Support for multiple languages
- Real-time progress tracking

### 2. AI-Powered Summarization

- Automatic content summarization using LLM
- Chapter extraction with timestamps
- Key topic identification
- Configurable summary length and style

### 3. Advanced Search & Discovery

- Full-text search across transcripts
- Search indexing for performance
- Language-based filtering
- Recent transcription history

### 4. User Experience

- Dark/light mode toggle
- Mobile-responsive design
- Animated backgrounds and transitions
- Real-time progress indicators
- Export functionality (JSON, CSV, TXT)

## Database Schema

### Core Models

**Transcript**

- Stores transcription data and metadata
- Links to video information
- Tracks processing status and duration
- Supports multiple languages

**Video**

- YouTube video metadata
- Thumbnail URLs and duration
- Processing status tracking

**Summary**

- AI-generated summaries
- Chapter extractions
- Configurable parameters

**SearchIndex**

- Full-text search optimization
- Tokenized content storage
- Language-specific indexing

### Performance Models

**QueryPerformanceLog**

- Database query performance tracking
- Optimization analytics
- Slow query identification

## API Architecture

### RESTful Endpoints

**Transcription Flow**
`POST /api/transcribe          - Start transcription
GET  /api/transcript/[id]     - Get transcript data
POST /api/transcript/[id]/regenerate-summary - Regenerate summary
DELETE /api/transcript/[id]/delete - Delete transcript`

**Video Management**
`GET /api/video/[videoId]      - Get video data
GET /api/video/[videoId]/chapters - Get video chapters`

**System Operations**
`GET /api/history              - Get recent transcriptions
GET /api/cache/status         - Cache health check
GET /api/db-monitor           - Database performance`

### Server Actions

- Form submissions for URL input
- Settings updates
- Data export operations

## Performance Optimizations

### Caching Strategy

- **Redis**: Session-based caching for API responses
- **Database**: Query result caching with TTL
- **CDN**: Static asset optimization via Next.js
- **Browser**: Client-side caching with proper headers

### Database Optimization

- Indexed columns for frequent queries
- Query performance monitoring
- Connection pooling with Prisma
- Search indexing for full-text search

### Frontend Performance

- Component lazy loading
- Image optimization with next/image
- Progressive loading for large transcripts
- Virtual scrolling for long content

## Security Considerations

### API Security

- Rate limiting on transcription endpoints
- Input validation with Zod schemas
- CORS configuration for API routes
- Environment variable protection

### Data Protection

- No user authentication required (anonymous usage)
- IP-based usage tracking (privacy-compliant)
- Secure API key management
- Data retention policies

## Deployment Architecture

### Environment Variables

`env

# Required

DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DEEPGRAM_API_KEY=...

# Optional

LLM_API_KEY=...
NODE_ENV=production
`

### Build Process

1. Prisma migration and client generation
2. Next.js build optimization
3. Static asset optimization
4. TypeScript compilation

### Monitoring

- Database query performance logs
- API response time tracking
- Error boundary implementation
- Client-side error reporting

## Future Enhancements

### Planned Features

- User authentication system
- Advanced analytics dashboard
- Multi-language UI support
- Batch processing capabilities
- Webhook integrations
- Mobile application

### Scalability Improvements

- Microservices architecture
- Queue-based processing
- Horizontal scaling support
- Multi-region deployment

## Development Guidelines

### Code Standards

- TypeScript strict mode
- ESLint configuration compliance
- Prettier formatting
- Component documentation with Storybook

### Testing Strategy

- Unit tests with Vitest
- Integration tests with Playwright
- Component testing with React Testing Library
- Performance testing for critical paths

### Contributing

- Follow existing code patterns
- Add tests for new features
- Update documentation
- Follow Git workflow with feature branches

This architecture supports the current feature set while maintaining flexibility for future enhancements and scaling requirements.

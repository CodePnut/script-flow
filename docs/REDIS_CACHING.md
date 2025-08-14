# Redis Caching Layer

This document describes the Redis caching implementation for ScriptFlow, which provides performance optimization through intelligent caching of frequently accessed transcripts and video data.

## Overview

The Redis caching layer implements:

- **Transcript Caching**: Cache completed transcripts to avoid database queries
- **Video Metadata Caching**: Cache video information for faster loading
- **Search Results Caching**: Cache search queries to improve search performance
- **Performance Monitoring**: Track cache hit rates, latency, and errors
- **Graceful Degradation**: Continue operation when Redis is unavailable

## Architecture

### Core Components

1. **Redis Client** (`src/lib/redis.ts`)
   - Singleton Redis client with connection management
   - Support for both local Redis and Upstash Redis (production)
   - Automatic reconnection and error handling

2. **Cache Service** (`src/lib/cache.ts`)
   - High-level caching operations
   - Performance metrics tracking
   - Cache invalidation strategies

3. **Cache Monitor** (`src/lib/cache-monitor.ts`)
   - Real-time performance monitoring
   - Health checks and alerting
   - Performance insights and recommendations

4. **Cache Initialization** (`src/lib/cache-init.ts`)
   - Automatic startup and shutdown handling
   - Process signal handling for graceful shutdown

## Configuration

### Environment Variables

```bash
# Local development (default: redis://localhost:6379)
REDIS_URL="redis://localhost:6379"

# Production: Upstash Redis (recommended for serverless)
UPSTASH_REDIS_REST_URL="your_upstash_redis_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"

# Optional: Enable cache monitoring in development
ENABLE_CACHE_MONITORING="true"
```

### Cache Configuration

```typescript
// Cache TTL values (in seconds)
export const CACHE_TTL = {
  TRANSCRIPT: 60 * 60 * 24, // 24 hours
  VIDEO_METADATA: 60 * 60 * 12, // 12 hours
  SEARCH_RESULTS: 60 * 30, // 30 minutes
  ANALYTICS: 60 * 60, // 1 hour
  SESSION: 60 * 60 * 24 * 7, // 7 days
}

// Redis key prefixes
export const REDIS_KEYS = {
  TRANSCRIPT: 'transcript:',
  VIDEO_METADATA: 'video:',
  USER_SESSION: 'session:',
  ANALYTICS: 'analytics:',
  SEARCH_RESULTS: 'search:',
}
```

## Usage

### Basic Caching Operations

```typescript
import { cache } from '@/lib/cache'

// Cache transcript
await cache.setTranscript(videoId, transcriptData)

// Retrieve cached transcript
const cachedTranscript = await cache.getTranscript(videoId)

// Invalidate cache
await cache.invalidateTranscript(videoId)
```

### API Integration

The caching layer is automatically integrated into API routes:

```typescript
// In API routes
import { cache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const videoId = 'example-video-id'

  // Try cache first
  const cachedData = await cache.getVideoMetadata(videoId)
  if (cachedData) {
    return NextResponse.json(cachedData)
  }

  // Fetch from database
  const data = await fetchFromDatabase(videoId)

  // Cache for future requests
  await cache.setVideoMetadata(videoId, data)

  return NextResponse.json(data)
}
```

## Monitoring

### Cache Status Component

The `CacheStatus` component provides real-time monitoring:

```typescript
import { CacheStatus } from '@/components/CacheStatus'

// In dashboard or admin panel
<CacheStatus />
```

### API Endpoints

Monitor cache performance via API:

```bash
# Get cache health and metrics
GET /api/cache

# Get specific metrics
GET /api/cache?action=metrics
GET /api/cache?action=health
GET /api/cache?action=stats

# Cache management
POST /api/cache
{
  "action": "invalidate-transcript",
  "videoId": "example-video-id"
}
```

### Performance Metrics

The cache service tracks:

- **Hit Rate**: Percentage of requests served from cache
- **Average Latency**: Response time for cache operations
- **Error Rate**: Percentage of failed cache operations
- **Memory Usage**: Redis memory consumption
- **Key Count**: Number of cached items

## Cache Invalidation

### Automatic Invalidation

- **New Transcripts**: Invalidate video cache when new transcript is created
- **Updated Content**: Invalidate related caches when data changes
- **TTL Expiration**: Automatic expiration based on configured TTL

### Manual Invalidation

```typescript
// Invalidate specific video
await cache.invalidateTranscript('video-id')

// Invalidate search results
await cache.invalidateSearchResults()

// Clear all cache (development only)
await cache.clearAll()
```

## Performance Optimization

### Cache Strategies

1. **Cache-Aside Pattern**: Check cache first, then database
2. **Write-Through**: Update cache when writing to database
3. **TTL-Based Expiration**: Automatic cleanup of stale data

### Best Practices

- **Cache Hot Data**: Focus on frequently accessed transcripts
- **Appropriate TTL**: Balance freshness vs performance
- **Graceful Degradation**: Handle Redis unavailability
- **Monitor Performance**: Track hit rates and latency

## Development

### Local Setup

1. **Install Redis**:

   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Ubuntu
   sudo apt install redis-server
   sudo systemctl start redis
   ```

2. **Configure Environment**:

   ```bash
   # .env.local
   REDIS_URL="redis://localhost:6379"
   ENABLE_CACHE_MONITORING="true"
   ```

3. **Test Connection**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Testing

Run cache tests:

```bash
npm run test cache.test.ts
```

### Debugging

Enable detailed logging:

```bash
# Set log level for Redis operations
DEBUG=redis:* npm run dev
```

## Production Deployment

### Upstash Redis (Recommended)

1. **Create Upstash Database**:
   - Visit [Upstash Console](https://console.upstash.com/)
   - Create new Redis database
   - Copy REST URL and token

2. **Configure Environment**:
   ```bash
   UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token"
   ```

### Alternative: Redis Cloud

1. **Redis Cloud Setup**:
   - Create Redis Cloud account
   - Deploy Redis instance
   - Get connection string

2. **Configure Environment**:
   ```bash
   REDIS_URL="redis://username:password@host:port"
   ```

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Check Redis server is running
   - Verify connection string
   - Check firewall settings

2. **High Memory Usage**:
   - Review TTL settings
   - Implement cache cleanup
   - Monitor key patterns

3. **Low Hit Rate**:
   - Analyze access patterns
   - Adjust TTL values
   - Review cache keys

### Health Checks

```typescript
import { checkRedisHealth } from '@/lib/redis'

const health = await checkRedisHealth()
console.log('Redis connected:', health.connected)
console.log('Latency:', health.latency, 'ms')
```

## Security Considerations

- **Connection Security**: Use TLS for production connections
- **Access Control**: Implement Redis AUTH if needed
- **Data Sensitivity**: Don't cache sensitive user data
- **Network Security**: Restrict Redis access to application servers

## Future Enhancements

- **Distributed Caching**: Multi-region cache replication
- **Cache Warming**: Pre-populate cache with popular content
- **Advanced Analytics**: Detailed cache usage analytics
- **Cache Compression**: Reduce memory usage with compression
- **Smart Eviction**: ML-based cache eviction policies

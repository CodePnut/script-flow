# Database Optimization and Performance Monitoring

This document describes the database optimization implementation for ScriptFlow, which provides comprehensive query performance monitoring, indexing strategies, and database health monitoring.

## Overview

The database optimization layer implements:

- **Query Performance Monitoring**: Track query execution times and identify slow queries
- **Enhanced Database Indexing**: Optimized indexes for common query patterns
- **Search Index Management**: Full-text search capabilities with tokenization
- **Performance Analytics**: Detailed metrics and optimization recommendations
- **Database Health Monitoring**: Connection status and performance tracking

## Architecture

### Core Components

1. **Database Optimization Service** (`src/lib/db-optimization.ts`)
   - Query performance monitoring and logging
   - Slow query detection and analysis
   - Database health checks
   - Performance metrics tracking

2. **Search Indexing Service** (`src/lib/search-indexing.ts`)
   - Automatic transcript indexing for search
   - Content tokenization and optimization
   - Batch indexing operations
   - Index maintenance and cleanup

3. **Enhanced Database Schema** (`prisma/schema.prisma`)
   - Optimized indexes for common queries
   - Analytics and performance logging tables
   - Search index tables for full-text search

4. **Database Monitor Component** (`src/components/DatabaseMonitor.tsx`)
   - Real-time performance monitoring UI
   - Database health status display
   - Maintenance action controls

## Database Schema Enhancements

### Enhanced Indexes

```prisma
model Transcript {
  // Enhanced composite indexes for efficient queries
  @@index([videoId])
  @@index([videoId, status])
  @@index([userId, createdAt])
  @@index([ipHash])
  @@index([ipHash, createdAt])
  @@index([status, createdAt])
  @@index([language, status]) // For language-specific queries
  @@index([duration, status]) // For duration-based filtering
  @@index([createdAt, status]) // For recent transcripts
  @@index([title]) // For title-based searches
}
```

### New Tables

#### Analytics Events

```prisma
model AnalyticsEvent {
  id          String   @id @default(cuid())
  userId      String?
  sessionId   String
  ipHash      String
  eventType   String
  eventData   Json
  timestamp   DateTime @default(now())

  // Indexes for efficient analytics queries
  @@index([userId, timestamp])
  @@index([sessionId, timestamp])
  @@index([ipHash, timestamp])
  @@index([eventType, timestamp])
  @@index([timestamp])
}
```

#### Search Index

```prisma
model SearchIndex {
  id          String   @id @default(cuid())
  transcriptId String  @unique
  content     String   @db.Text
  tokens      String[] // Tokenized content for search
  language    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  transcript  Transcript @relation(fields: [transcriptId], references: [id])

  // Indexes for search optimization
  @@index([language])
  @@index([createdAt])
}
```

#### Query Performance Log

```prisma
model QueryPerformanceLog {
  id          String   @id @default(cuid())
  queryType   String
  queryHash   String   // Hash of the query for grouping
  duration    Int      // Query duration in milliseconds
  parameters  Json?    // Query parameters (anonymized)
  timestamp   DateTime @default(now())

  // Indexes for performance analysis
  @@index([queryType, timestamp])
  @@index([queryHash, timestamp])
  @@index([duration, timestamp])
  @@index([timestamp])
}
```

## Usage

### Query Performance Monitoring

```typescript
import { dbOptimization } from '@/lib/db-optimization'

// Execute query with performance monitoring
const result = await dbOptimization.executeWithMonitoring(
  'transcript_fetch',
  () => prisma.transcript.findFirst({ where: { videoId } }),
  { videoId },
)

// Get performance statistics
const stats = dbOptimization.getDatabaseStats()
console.log('Average query time:', stats.averageQueryTime)
console.log('Slow queries:', stats.slowQueries)
```

### Optimized Query Functions

```typescript
import { optimizedQueries } from '@/lib/db-optimization'

// Use pre-optimized queries with monitoring
const transcript = await optimizedQueries.findTranscript(videoId)
const history = await optimizedQueries.getUserHistory(userHash, page, limit)
```

### Search Indexing

```typescript
import { searchIndexing } from '@/lib/search-indexing'

// Index a transcript for search
await searchIndexing.indexTranscript(transcriptId)

// Batch index multiple transcripts
await searchIndexing.batchIndexTranscripts(transcriptIds, 10)

// Index all unindexed transcripts
await searchIndexing.indexAllUnindexedTranscripts()

// Get indexing statistics
const stats = await searchIndexing.getIndexStats()
```

## API Endpoints

### Database Monitoring API

```bash
# Get comprehensive database monitoring info
GET /api/db-monitor

# Get specific monitoring data
GET /api/db-monitor?action=health
GET /api/db-monitor?action=stats
GET /api/db-monitor?action=slow-queries
GET /api/db-monitor?action=search-index

# Database maintenance operations
POST /api/db-monitor
{
  "action": "cleanup-logs",
  "daysToKeep": 30
}

POST /api/db-monitor
{
  "action": "index-transcripts"
}
```

## Performance Monitoring

### Metrics Tracked

- **Query Performance**: Execution time, hit/miss rates, error rates
- **Query Types**: Breakdown by operation type (transcript_fetch, user_history, etc.)
- **Slow Queries**: Queries exceeding performance thresholds
- **Database Health**: Connection status, response times
- **Search Index**: Index statistics, tokenization metrics

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY: 1000, // Queries taking longer than 1 second
  WARNING_QUERY: 500, // Queries taking longer than 500ms
  FAST_QUERY: 100, // Queries faster than 100ms
}
```

### Monitoring Dashboard

The `DatabaseMonitor` component provides real-time monitoring:

- Database connection status and response times
- Query performance statistics and breakdowns
- Search index statistics and health
- Optimization recommendations
- Maintenance action controls (development only)

## Search Optimization

### Content Tokenization

The search indexing service processes transcript content:

1. **Content Extraction**: Title, description, and utterance text
2. **Tokenization**: Convert to searchable tokens
3. **Stop Word Removal**: Filter common words
4. **Deduplication**: Remove duplicate tokens
5. **Storage**: Store in optimized search index

### Search Features

- **Full-text Search**: Search across all transcript content
- **Language-aware**: Separate indexes by language
- **Batch Processing**: Efficient bulk indexing operations
- **Automatic Indexing**: New transcripts automatically indexed

## Performance Optimization Strategies

### Query Optimization

1. **Composite Indexes**: Multi-column indexes for common query patterns
2. **Selective Indexing**: Indexes on frequently queried fields
3. **Query Monitoring**: Track and optimize slow queries
4. **Connection Pooling**: Efficient database connection management

### Caching Strategy

Combined with Redis caching layer:

- Database queries cached for frequently accessed data
- Search results cached to reduce database load
- Performance metrics cached for dashboard display

### Batch Operations

- **Bulk Indexing**: Process multiple transcripts efficiently
- **Batch Analytics**: Group analytics events for better performance
- **Cleanup Operations**: Periodic maintenance with minimal impact

## Monitoring and Alerting

### Automatic Monitoring

- **Slow Query Detection**: Automatic logging of queries > 1000ms
- **Performance Warnings**: Alerts for queries > 500ms
- **Health Checks**: Regular database connectivity checks
- **Index Monitoring**: Track search index health and statistics

### Recommendations Engine

The system provides optimization recommendations based on:

- Query performance patterns
- Slow query analysis
- Database usage statistics
- Index utilization metrics

## Development and Testing

### Local Development

1. **Database Setup**: PostgreSQL with optimized schema
2. **Migration**: Apply database migrations for new tables and indexes
3. **Monitoring**: Enable performance monitoring in development
4. **Testing**: Comprehensive test suite for all optimization features

### Testing

```bash
# Run database optimization tests
npm run test db-optimization.test.ts

# Run all tests including optimization
npm run test:run
```

### Performance Testing

- **Load Testing**: Test query performance under load
- **Index Testing**: Verify index effectiveness
- **Monitoring Testing**: Test performance tracking accuracy
- **Search Testing**: Validate search index functionality

## Production Deployment

### Database Optimization

1. **Index Creation**: Apply all optimized indexes
2. **Performance Monitoring**: Enable comprehensive monitoring
3. **Cleanup Scheduling**: Set up periodic maintenance tasks
4. **Alert Configuration**: Configure performance alerts

### Monitoring Setup

1. **Dashboard Access**: Database monitor in admin dashboard
2. **API Monitoring**: Track API endpoint performance
3. **Log Analysis**: Monitor slow query logs
4. **Health Checks**: Regular database health verification

## Troubleshooting

### Common Issues

1. **Slow Queries**: Check index usage and query patterns
2. **High Memory Usage**: Review search index size and cleanup
3. **Connection Issues**: Verify database connectivity and pooling
4. **Index Problems**: Check search index health and rebuild if needed

### Performance Analysis

```typescript
// Get detailed performance analysis
const analysis = await dbOptimization.getSlowQueryAnalysis(50)
console.log('Slow queries:', analysis.queries)
console.log('Recommendations:', analysis.recommendations)

// Get search index statistics
const indexStats = await searchIndexing.getIndexStats()
console.log('Index health:', indexStats)
```

## Future Enhancements

- **Advanced Analytics**: ML-based query optimization
- **Distributed Indexing**: Multi-region search capabilities
- **Real-time Monitoring**: Live performance dashboards
- **Automated Optimization**: Self-tuning database parameters
- **Advanced Search**: Semantic search and AI-powered recommendations

This database optimization implementation provides a solid foundation for high-performance, scalable transcript management with comprehensive monitoring and optimization capabilities.

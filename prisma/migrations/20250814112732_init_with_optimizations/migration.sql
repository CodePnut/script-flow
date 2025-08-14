-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "duration" DOUBLE PRECISION,
    "chapters" JSONB,
    "utterances" JSONB NOT NULL,
    "metadata" JSONB,
    "deepgram_job" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "user_id" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" TEXT[],
    "language" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_performance_log" (
    "id" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "parameters" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_performance_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_deepgram_job_key" ON "transcripts"("deepgram_job");

-- CreateIndex
CREATE INDEX "transcripts_video_id_idx" ON "transcripts"("video_id");

-- CreateIndex
CREATE INDEX "transcripts_video_id_status_idx" ON "transcripts"("video_id", "status");

-- CreateIndex
CREATE INDEX "transcripts_user_id_created_at_idx" ON "transcripts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "transcripts_ip_hash_idx" ON "transcripts"("ip_hash");

-- CreateIndex
CREATE INDEX "transcripts_ip_hash_created_at_idx" ON "transcripts"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "transcripts_status_created_at_idx" ON "transcripts"("status", "created_at");

-- CreateIndex
CREATE INDEX "transcripts_language_status_idx" ON "transcripts"("language", "status");

-- CreateIndex
CREATE INDEX "transcripts_duration_status_idx" ON "transcripts"("duration", "status");

-- CreateIndex
CREATE INDEX "transcripts_created_at_status_idx" ON "transcripts"("created_at", "status");

-- CreateIndex
CREATE INDEX "transcripts_title_idx" ON "transcripts"("title");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_timestamp_idx" ON "analytics_events"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_timestamp_idx" ON "analytics_events"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_ip_hash_timestamp_idx" ON "analytics_events"("ip_hash", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_timestamp_idx" ON "analytics_events"("event_type", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "search_index_transcript_id_key" ON "search_index"("transcript_id");

-- CreateIndex
CREATE INDEX "search_index_language_idx" ON "search_index"("language");

-- CreateIndex
CREATE INDEX "search_index_created_at_idx" ON "search_index"("created_at");

-- CreateIndex
CREATE INDEX "query_performance_log_query_type_timestamp_idx" ON "query_performance_log"("query_type", "timestamp");

-- CreateIndex
CREATE INDEX "query_performance_log_query_hash_timestamp_idx" ON "query_performance_log"("query_hash", "timestamp");

-- CreateIndex
CREATE INDEX "query_performance_log_duration_timestamp_idx" ON "query_performance_log"("duration", "timestamp");

-- CreateIndex
CREATE INDEX "query_performance_log_timestamp_idx" ON "query_performance_log"("timestamp");

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_index" ADD CONSTRAINT "search_index_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

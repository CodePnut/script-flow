/**
 * Lightweight LLM utilities for smarter summarization
 *
 * Uses OpenAI's Chat Completions API via fetch when OPENAI_API_KEY is set.
 * Falls back to caller if not configured.
 */

export type SummaryStyle = 'brief' | 'detailed' | 'executive' | 'educational'

export interface LLMKeyPoint {
  text: string
}

export interface LLMSummaryResult {
  summary: string
  keyPoints: string[]
  topics: string[]
}

export interface LLMParams {
  style: SummaryStyle
  maxLength?: number
  focusOnTopics?: string[]
  videoTitle?: string
}

export interface TranscriptChunk {
  start: number // seconds
  end: number // seconds
  text: string
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY
}

function modelName(): string {
  return process.env.OPENAI_API_MODEL || 'gpt-4o-mini'
}

function secsToClock(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function styleGuidance(style: SummaryStyle): string {
  switch (style) {
    case 'brief':
      return 'Write ~150-200 words max. Focus on the core narrative and outcomes.'
    case 'detailed':
      return 'Write ~300-400 words. Capture structure, flow, and nuanced insights.'
    case 'executive':
      return 'Write ~250-300 words. Emphasize business value, decisions, risks, outcomes.'
    case 'educational':
      return 'Write ~280-350 words. Emphasize concepts, definitions, examples, and learning outcomes.'
    default:
      return 'Write ~300 words.'
  }
}

/**
 * Summarize full transcript text with a single call if within safe size bounds.
 */
async function summarizeWholeWithOpenAI(fullText: string, params: LLMParams): Promise<LLMSummaryResult> {
  const { style, maxLength, focusOnTopics, videoTitle } = params
  const guidance = styleGuidance(style)

  const system = [
    'You are an expert video summarizer.',
    'Summarize transcripts into concise, non-redundant prose.',
    'Do not repeat transcript lines verbatim; synthesize ideas.',
    'Return strictly valid JSON matching the schema.',
  ].join(' ')

  const user = [
    videoTitle ? `Title: ${videoTitle}` : undefined,
    focusOnTopics && focusOnTopics.length > 0
      ? `Focus on these topics if present: ${focusOnTopics.join(', ')}`
      : undefined,
    `Summary style: ${style}. ${guidance}`,
    maxLength ? `Hard limit ~${maxLength} words.` : undefined,
    'Produce 5 strongest, non-overlapping key points (1 sentence each).',
    'Identify 3-6 high-level topics.',
    '',
    'Transcript:',
    fullText,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName(),
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            user +
            '\n\nReturn JSON: {"summary": string, "keyPoints": string[5], "topics": string[]}\n',
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI error (${response.status}): ${body || response.statusText}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content || '{}'
  let parsed: LLMSummaryResult
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Failed to parse LLM JSON for whole summarization')
  }
  // Basic normalization
  parsed.keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : []
  parsed.topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 6) : []
  return parsed
}

/**
 * Map-Reduce style summarization for long transcripts.
 */
async function summarizeChunkedWithOpenAI(
  chunks: TranscriptChunk[],
  params: LLMParams,
): Promise<LLMSummaryResult> {
  const { style, maxLength, focusOnTopics, videoTitle } = params

  // 1) Summarize each chunk concisely
  const chunkSummaries: Array<{ summary: string; keyPoints: string[] }> = []
  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]
    const system = [
      'You summarize segments of a video transcript.',
      'Write concise synthesis without copying lines. Return JSON.',
    ].join(' ')
    const user = [
      videoTitle ? `Title: ${videoTitle}` : undefined,
      `Chunk ${i + 1} of ${chunks.length} (${secsToClock(ch.start)} - ${secsToClock(ch.end)})`,
      focusOnTopics && focusOnTopics.length > 0
        ? `If relevant, emphasize: ${focusOnTopics.join(', ')}`
        : undefined,
      'Produce a compact chunk summary (2-4 sentences) and 2-3 key points.',
      'Transcript chunk:',
      ch.text,
    ]
      .filter(Boolean)
      .join('\n')

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName(),
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content:
              user +
              '\n\nReturn JSON: {"summary": string, "keyPoints": string[]}\n',
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`OpenAI chunk error (${response.status}): ${body || response.statusText}`)
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content || '{}'
    let parsed: { summary?: string; keyPoints?: string[] }
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = {}
    }
    chunkSummaries.push({
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
    })
  }

  // 2) Reduce: combine chunk summaries into final result
  const system = [
    'You combine multiple segment summaries into a single coherent video summary.',
    'Synthesize, deduplicate, and produce a flowing summary and strongest 5 key points.',
    'Return strictly valid JSON.',
  ].join(' ')

  const combined = chunkSummaries
    .map((s, i) => `Chunk ${i + 1}:\nSummary: ${s.summary}\nKeyPoints: ${s.keyPoints.join(' | ')}`)
    .join('\n\n')

  const user = [
    videoTitle ? `Title: ${videoTitle}` : undefined,
    `Summary style: ${style}. ${styleGuidance(style)}`,
    maxLength ? `Hard limit ~${maxLength} words.` : undefined,
    focusOnTopics && focusOnTopics.length > 0
      ? `Give proportionate weight to: ${focusOnTopics.join(', ')}`
      : undefined,
    'Combine the following chunk summaries into a cohesive final output:',
    combined,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName(),
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            user +
            '\n\nReturn JSON: {"summary": string, "keyPoints": string[5], "topics": string[]}\n',
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI reduce error (${response.status}): ${body || response.statusText}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content || '{}'
  let parsed: LLMSummaryResult
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Failed to parse LLM JSON for reduced summarization')
  }
  parsed.keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : []
  parsed.topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 6) : []
  return parsed
}

/**
 * Public API: Summarize transcript using the best available LLM path.
 * Throws if no provider is configured.
 */
export async function summarizeTranscriptLLM(
  chunks: TranscriptChunk[],
  params: LLMParams,
): Promise<LLMSummaryResult> {
  if (!hasOpenAI()) {
    throw new Error('No LLM provider configured (set OPENAI_API_KEY)')
  }

  // Concatenate if reasonably small; else use chunked map-reduce
  const fullText = chunks.map((c) => c.text).join('\n')
  const approxChars = fullText.length
  const videoTitle = params.videoTitle

  if (approxChars < 12000) {
    return summarizeWholeWithOpenAI(fullText, { ...params, videoTitle })
  }

  // Use chunked summarization; ensure chunks are not too large
  const normalized: TranscriptChunk[] = []
  const CHAR_LIMIT = 4000
  let buffer = ''
  let start = chunks[0]?.start ?? 0
  let end = chunks[0]?.end ?? 0
  for (const ch of chunks) {
    if (buffer.length + ch.text.length > CHAR_LIMIT) {
      normalized.push({ start, end, text: buffer })
      buffer = ch.text
      start = ch.start
      end = ch.end
    } else {
      buffer += (buffer ? ' ' : '') + ch.text
      end = ch.end
    }
  }
  if (buffer) normalized.push({ start, end, text: buffer })

  return summarizeChunkedWithOpenAI(normalized, { ...params, videoTitle })
}

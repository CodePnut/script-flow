# YouTube Transcriber Project – Comprehensive Specification

**App name:** Scriptflow

_Target stack:_ **Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + Deepgram STT**

---

## 1 · Overview

Scriptflow is a modern web application designed to convert any public YouTube video into a fully interactive, enriched transcript experience. Users can paste a video URL and receive:

- A searchable, timestamp-linked transcript
- Auto-generated video summaries
- Chapter segmentation with click-to-seek
- Playback integration with an embedded player

All transcription is powered by the Deepgram API, which offers advanced speech-to-text with summarisation and diarisation features.

Additional planned features include:

- Recent transcription history (dashboard view)
- Settings page for theme preferences and API usage
- Mobile-responsive, dark-mode-first UI
- Animated backgrounds and polished motion transitions

The free-tier usage is covered by Deepgram’s **US \$200 credit (\~750 hours of transcription) with no card required** ([deepgram.com](https://deepgram.com/?utm_source=chatgpt.com), [deepgram.com](https://deepgram.com/pricing?utm_source=chatgpt.com)).

---

## 2 · Front‑End Specification

### 2.1 Tech stack

| Area       | Choice                        | Notes                                                 |
| ---------- | ----------------------------- | ----------------------------------------------------- |
| Framework  | **Next.js 14** (app router)   | React 18 features, server actions, RSC caching        |
| Styling    | **Tailwind CSS 3.5+**         | JIT, first‑party dark‑mode, CSS vars for theme tokens |
| UI library | **shadcn/ui**                 | Radix primitives; consistent accessibility            |
| Animations | **Framer Motion 11**          | Page transitions & micro‑interactions                 |
| Icons      | Lucide‑react                  | Feather‑style outline set                             |
| Fonts      | Inter (sans) + JetBrains Mono | via `next/font/google`                                |

### 2.2 Design principles

- **Modern minimalism** – generous whitespace, clear hierarchy, max 2 accent colours.
- **Dark‑mode first** – auto based on OS, toggle in navbar.
- **Accessible by default** – colour contrast ≥ WCAG AA, keyboard focus rings, aria‑labels.
- **Mobile‑first** – breakpoint at `sm:640px`.

#### 2.2a Theme & live background (Devin‑style)

- **Colour palette** – charcoal `#0D1117` base, electric‑mint accent `#2AFFC3`; light‑mode flips to soft white base with charcoal text.
- **Geometry particle canvas** – full‑bleed low‑poly mesh with softly glowing particles on each vertex, gentle parallax and hover twinkle. Mirrors the aesthetic of [Devin AI](https://devin.ai).
- **Implementation path:**
  1. Use **react‑tsparticles** with `linksPolygon` + `noise` options **or** a minimal **three.js** shader for triangular grid.
  2. Client‑side only: `dynamic(() => import('@/components/ParticleBackground'), { ssr: false })`.
  3. Styled with `absolute inset-0 -z-10 overflow-hidden`; dims to `opacity-30` for reduced distraction.
  4. Particle/line colours consume CSS vars `--accent` (mint) & respect `prefers-reduced-motion`.

- **Reduced‑motion support** – if user opts for reduced motion, background switches to a static SVG mesh.

### 2.3 Information architecture / page map Information architecture / page map

| Route              | Purpose                           | Key sections                                                 |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| `/`                | Landing (hero, feature grid, CTA) | Hero + typewriter tagline, live demo form                    |
| `/transcribe`      | URL input + history               | URL form, recent videos list                                 |
| `/video/[videoId]` | Transcript viewer                 | Embedded player, tabs: _Transcript_ · _Summary_ · _Chapters_ |
| `/dashboard`       | User library                      | Paginated table (TanStack Table)                             |
| `/settings`        | Profile, API usage                | Theme toggle, export data                                    |

### 2.4 Core component inventory

- **ParticleBackground** – client‑only component rendering Devin‑style geometry particles.

- **Navbar** – sticky/top‑blur, mobile drawer slide‑in (Framer `AnimatePresence`).

- **URLForm** – shadcn `Form`, Zod validation, paste‑detect autofocus.

- **ProgressBar** – animated gradient while Deepgram runs.

- **TranscriptViewer** – scrollable column with search, timestamp links, lazy‑highlight.

- **SummaryCard** – shadcn `Card` with AI‑generated bullets.

- **ChapterList** – collapsible accordions, clicking seeks player.

- **Toast** – shadcn `use-toast` for success/error.

- **ThemeSwitcher** – Sun/moon icon toggle, persists in `localStorage`.

- **Footer** – minimal links, attribution, GitHub repo badge.

- **Navbar** – sticky/top‑blur, mobile drawer slide‑in (Framer `AnimatePresence`).

- **URLForm** – shadcn `Form`, Zod validation, paste‑detect autofocus.

- **ProgressBar** – animated gradient while Deepgram runs.

- **TranscriptViewer** – scrollable column with search, timestamp links, lazy‑highlight.

- **SummaryCard** – shadcn `Card` with AI‑generated bullets.

- **ChapterList** – collapsible accordions, clicking seeks player.

- **Toast** – shadcn `use-toast` for success/error.

- **ThemeSwitcher** – Sun/moon icon toggle, persists in `localStorage`.

- **Footer** – minimal links, attribution, GitHub repo badge.

### 2.5 Animations & micro‑interactions

| Context           | Motion spec                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Page change       | `initial:{opacity:0, y:20}`, `animate:{opacity:1, y:0}`, `exit:{opacity:0, y:-20}`, easing: `easeOut`, duration 0.35 s |
| Navbar on scroll  | Background blur + `backdrop‑filter` fade‑in at 30 px scroll                                                            |
| Button hover      | Scale 1.03, shadow‑lg, colour tint via CSS transition 150 ms                                                           |
| Transcript reveal | Staggered fade‑in lines using Framer `motion.div` children                                                             |

### 2.6 State management

- **Local contextual state** (React): form inputs, UI toggles.
- **Global lightweight store**: **Zustand** for auth session & user settings.
- **React‑Query** (`@tanstack/react‑query`) for server interactions & caching transcripts.

### 2.7 Responsiveness & layout

- Tailwind grid utilities (`grid‑cols‑[var]`, `auto‑rows‑min`) for adaptive layouts.
- Transcript page: CSS grid `(video 40% | transcript 60%)` desktop, column‑reverse on mobile.

### 2.8 Performance & SEO

- RSC default for landing & static sections.
- `next/image` for hero thumbnails.
- Open Graph tags via `metadata` export.
- Lighthouse target ≥ 95 for perf/accessibility/best‑practices.

### 2.9 Testing

- **Playwright @next** – e2e flows (paste URL → see transcript).
- **Vitest + Testing Library** – component snapshots & edge‑cases.

### 2.10 Tooling & Dev‑process

- Conventional commits, commitlint, Husky pre‑commit.
- CI: Vercel Checks + GitHub Actions running tests & ESLint.
- Storybook for component playground.

### 2.11 Coding conventions & best practices (front‑end)

> 🧠 **Clarity for junior developers is a top priority**.
>
> - All folder and file structures should follow consistent, descriptive naming.
> - Include index files only when a folder contains shared exports or logical groupings (e.g., hooks, UI components).
> - Write **concise comments** in all key areas of logic, explaining intent (the “why”) more than just function.
> - If a folder has more than 3 files, add a `README.md` to explain how things connect.
> - **Absolutely NO custom inline styling** (`style={{ … }}`) or hard‑coded class strings that bypass Tailwind/shadcn tokens. _All_ visual styles must be expressed via Tailwind utilities, shadcn props/variants, or CSS variables declared in `tailwind.config.ts`. This rule is non‑negotiable and CI linting should fail on any inline `style` prop usage.

1. **Semantic colour tokens**
   - Declare palette in `tailwind.config.ts` using CSS variables (`--color-bg`, `--color-fg`, `--color-accent`, etc.).
   - Use utilities like `bg-bg`, `text-fg`, `border-accent`—never hard‑code hex values in JSX/TSX.

2. **Component architecture**
   - Keep files atomic: one component per file in `/components/*`.
   - Collocate hooks in `/hooks/*`; shared utils in `/lib/utils.ts`.
   - Strict TypeScript (`"strict": true`) and no `any` unless justified.

3. **Clean code & refactorability**
   - Prettier + ESLint (`next/core-web-vitals`) with import sorting.
   - Prefer composition over prop drilling; extract reusable variants before adding props.
   - Descriptive file/case: `PascalCase.tsx` for components, `kebab-case.ts` for hooks/utils.

4. **Testing discipline**
   - **Vitest + Testing Library**: snapshot & behaviour tests per component (`Component.test.tsx`).
   - **Playwright**: e2e flows recorded in `/e2e`; run headless in CI.
   - Require green tests before PR merge; Cursor tasks must run `npm run test`.

5. **Accessibility & semantics**
   - Use shadcn/Radix primitives where possible for keyboard and ARIA compliance.
   - Run `@axe-core/react` in development; fix violations immediately.

6. **Performance**
   - Lazy‑load heavy modules (`dynamic()` with SSR false where appropriate).
   - Memoise expensive renders (`React.memo`, `useMemo`).
   - Optimise images via `next/image` and correct sizes.

7. **Documentation & comments**
   - JSDoc on exported functions; Storybook stories double as living docs.
   - Update the spec when architectural decisions change.

8. **Commit hygiene**
   - Conventional commit style (`feat:`, `fix:`, `chore:`); one logical change per commit.
   - PR description must include test plan and screenshots/gifs for UI changes.
   - Conventional commit style (`feat:`, `fix:`, `chore:`); one logical change per commit.
   - PR description must include test plan and screenshots/gifs for UI changes.

### 2.12 Front-end phased implementation plan

### 2.13 Suggested Folder Structure

```
/app
│
├── layout.tsx              # Global layout: <ThemeProvider>, <ParticleBackground>
├── page.tsx                # Landing page
│
├── transcribe/
│   └── page.tsx            # Transcribe input page
│
├── video/
│   └── [videoId]/
│       └── page.tsx        # Transcript viewer
│
├── dashboard/
│   └── page.tsx            # User transcript history
│
├── settings/
│   └── page.tsx            # Theme & API usage config
│
├── api/
│   ├── transcribe/route.ts       # POST YouTube → Deepgram
│   ├── transcript/[id]/route.ts # GET transcript result
│   └── webhook/deepgram/route.ts# POST from Deepgram on job complete
```

```
/components
│
├── ui/                     # shadcn/ui wrapped primitives
│   ├── Button.tsx
│   ├── Tabs.tsx
│   └── ...
│
├── ParticleBackground.tsx  # Animated geometry bg
├── ThemeSwitcher.tsx       # Sun/Moon toggle
├── Navbar.tsx              # Responsive header
├── URLForm.tsx             # Input + validation
├── TranscriptViewer.tsx    # Time-linked transcript scroll
├── SummaryCard.tsx         # AI summary display
├── ChapterList.tsx         # Auto chapters accordion
├── ProgressBar.tsx         # Animated loading bar
├── RecentVideos.tsx        # Shortlist history viewer
└── Footer.tsx              # Branding + links
```

```
/hooks
├── useTheme.ts             # Theme context hook
├── useTranscribe.ts        # Handles fetch + state
└── useHistoryStore.ts      # Zustand history store
```

```
/lib
├── youtube.ts              # ytdl-core helpers, videoId parser
├── deepgram.ts             # Upload + transcribe logic
├── utils.ts                # Date/time utils, text shortening, etc.
└── constants.ts            # Regex, color tokens, etc.
```

```
/styles
├── globals.css             # Tailwind + theme tokens
└── tailwind.config.ts      # Color palette + theme extensions
```

```
/tests
├── components/             # Vitest + React Testing Library
├── pages/                  # Page-level tests
└── e2e/                    # Playwright e2e flows
```

> 📚 **Tip for juniors:** Each folder contains purpose-driven files with short comments and clearly named components. Add `README.md` files to clarify folders with more than 3 items.

### 2.12 Front-end phased implementation plan

| Phase | Goal                          | Key deliverables                                                                                       |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0     | **Scaffolding & CI**          | `create-next-app`, Tailwind + shadcn init, ESLint/Prettier, Husky, CI pipeline.                        |
| 1     | **Global theme & background** | Implement CSS colour tokens, `ParticleBackground` component, dark‑mode toggle, Navbar skeleton.        |
| 2     | **Landing page**              | Hero with Devin‑style geometry backdrop, feature grid, live demo URL form, smooth page transition.     |
| 3     | **Transcribe page**           | URLForm with Zod, ProgressBar with mock async, toast notifications.                                    |
| 4     | **Video viewer**              | Embedded player + Tabs (Transcript, Summary, Chapters), responsive layout, animated transcript reveal. |
| 5     | **Dashboard & Settings**      | Paginated table (TanStack), Theme settings, API usage stats placeholder.                               |
| 6     | **Testing & polish**          | Write Vitest + Playwright coverage ≥ 90%; Lighthouse perf pass > 95; refactor, lint pass.              |

### Appendix A – Cursor AI prompt template

```text
You are Cursor AI acting inside a Next.js 14 workspace.
Reference spec: docs/YouTube-Transcriber-Spec.md (Front‑end section).

TASK CONTEXT:
Phase: <insert phase number & title>
Objective: <clear user story>

REQUIREMENTS:
- TypeScript only; no `any` unless necessary.
- Use Tailwind utilities + shadcn/ui components.
- Apply semantic colour tokens (bg-bg, text-fg, accent etc.).
- Follow strict lint rules; code must pass `pnpm test` and `pnpm lint`.
- Update or create Storybook stories for every new component.

OUTPUT FORMAT:
Provide the exact file diffs in Cursor patch format, no commentary beyond code.
```

---

## 3 · Back‑End Specification

### 3.1 Architecture

- **Backend‑for‑frontend**: Next.js API routes (Node 20 runtime). Serverless on Vercel.
- Long‑running jobs delegated to Vercel Cron or a lightweight queue (Upstash Redis).

### 3.2 External services

| Purpose            | Service                    | Notes                                                                                        |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------------- |
| Speech‑to‑text     | **Deepgram**               | Free \$200 credit / \~750 h   ([deepgram.com](https://deepgram.com/?utm_source=chatgpt.com)) |
| Captions fallback  | YouTube TimedText endpoint | No auth required                                                                             |
| Auth               | Supabase Auth              | Email‑link + social OAuth                                                                    |
| Database           | PlanetScale (MySQL)        | Prisma ORM                                                                                   |
| Rate‑limit / queue | Upstash Redis              | Per‑IP rate & job queue                                                                      |

### 3.3 Data model (Prisma)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  transcripts Transcript[]
  createdAt   DateTime @default(now())
}

model Transcript {
  id          String   @id @default(cuid())
  videoId     String   @index
  title       String
  summary     String?
  language    String   @default("en")
  chapters    Json?
  utterances  Json
  deepgramJob String   @unique
  createdAt   DateTime @default(now())
  user        User?    @relation(fields:[userId], references:[id])
  userId      String?
}
```

### 3.4 API endpoints

| Method & Path                | Purpose                         | Auth?         | Body / Query            |
| ---------------------------- | ------------------------------- | ------------- | ----------------------- |
| `POST /api/transcribe`       | Kick off transcription          | optional      | `{ youtubeUrl:string }` |
| `GET  /api/transcript/[id]`  | Fetch cached result             | optional      | –                       |
| `GET  /api/video/[videoId]`  | Metadata + transcript if exists | optional      | –                       |
| `GET  /api/user/history`     | List user transcripts           | **Y**         | pagination params       |
| `POST /api/webhook/deepgram` | Receive job‑complete push       | secret header | Deepgram JSON           |

### 3.5 Background workflow

1. Client POSTs `/transcribe`.
2. Route streams audio to Deepgram (`nova‑3`, `smart_format`, `diarize`, `summarize`).
3. Deepgram processes; upon completion hits webhook OR we poll.
4. Store transcript JSON; broadcast via `sse` or mutate SWR cache.

### 3.6 Security & limits

- Rate‑limit 10 requests / min per IP via Upstash.
- Validate YouTube URLs against regex + `ytdl.validateURL`.
- Strip query params to avoid duplicate IDs in DB.

### 3.7 Cost guard‑rails

- Skip Deepgram if YouTube captions already exist.
- Hard stop > 60 min video unless user confirms.
- Purge transcripts older than 90 days by default (cron).

### 3.8 Deployment & DevOps

- **Vercel** – preview deployments per PR, edge network for static pages.
- **PlanetScale** database branch per environment.
- **GitHub Actions** – test & lint workflow.
- **Sentry** for runtime errors, **Logtail** for structured logs.

### 3.9 Observability

- Deepgram webhook latency metric.
- Route `/api/health` returning DB, Redis, Deepgram ping.
- Grafana Cloud dashboard via Prometheus exporter if scale increases.

### 3.10 Future extensions

- Translate transcripts (`/api/translate`).
- AI Q\&A chat using RAG over transcript + chapters.
- Bulk playlist ingestion worker.
- Stripe billing for usage beyond free tier.

---

**End of specification v1.0**

> Feel free to comment or request changes—this doc is designed for quick iteration as the project evolves.

### Appendix B – Phase‑specific Cursor prompts (precision edition)

> **How to use:** Copy the whole block for your phase into Cursor. After it runs, execute the listed commands locally (`pnpm lint && pnpm test && pnpm build`). Only merge if _all_ criteria under **Definition of Done** are met.

---

#### Phase 0 – Scaffolding & CI

```text
You are Cursor AI in an empty folder.

PHASE: 0 — Scaffolding & CI Setup

GOAL: Create a production‑ready Next.js 14 workspace with linting, formatting, tests, and CI.

TASKS
1. Run `npx create-next-app@latest . --typescript --tailwind --app --eslint`.
2. Initialise shadcn/ui: `npx shadcn-ui@latest init` answering defaults.
3. Install tooling: `npm install -D prettier eslint-plugin-import eslint-plugin-tailwindcss eslint-config-prettier eslint-plugin-jsx-a11y husky lint-staged vitest @testing-library/react @testing-library/jest-dom @types/testing-library__jest-dom`.
4. Add `.prettierrc.json` with `{ "singleQuote": true, "semi": false }`.
5. Configure ESLint (`.eslintrc.json`) with `next/core-web-vitals`, `plugin:tailwindcss/recommended`, and import order.
6. Configure **Husky** pre‑commit hook: `npx husky add .husky/pre-commit "npm run lint && npm run test"`.
7. Add GitHub Actions workflow `.github/workflows/ci.yml` that runs `npm install`, `npm run lint`, `npm run test` on `push` and `pull_request`.
8. Commit everything: Conventional commit message `feat: scaffold project`.

DEFINITION OF DONE
- `npm run lint` exits 0 with no warnings.
- `npm run test` runs (even if zero tests) and exits 0.
- `npm run build` succeeds.
- Repo contains `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `.prettierrc.json`, `.eslintrc.json`, and workflow file.

OUTPUT: Exact file diffs only (Cursor patch format).
```

---

#### Phase 1 – Global theme & Devin‑style background

````text
You are Cursor AI in the existing repo.

PHASE: 1 — Global theme & background

GOAL: Introduce semantic colour tokens, dark‑mode support, Navbar skeleton, and animated particle background.

TASKS
1. Extend `tailwind.config.ts`
   ```ts
   theme: {
     extend: {
       colors: {
         bg: 'var(--color-bg)',
         fg: 'var(--color-fg)',
         accent: 'var(--color-accent)'
       }
     }
   }
````

2. Add global CSS variables in `app/globals.css` (dark & light selectors).
3. Install background lib: `pnpm add react-tsparticles tsparticles-preset-links`.
4. Create `components/ParticleBackground.tsx` using `react-tsparticles` preset `links` + `noise`. Respect `prefers-reduced-motion` via `useReducedMotion`.
5. Create `components/ThemeProvider.tsx` wrapping children with context + `useTheme` hook.
6. Add `components/ThemeSwitcher.tsx` (moon/sun icon button). Persist choice in `localStorage`.
7. Implement `components/Navbar.tsx` (shadcn `Sheet` for mobile) and include `ThemeSwitcher`.
8. Wrap `app/layout.tsx` root with `<ThemeProvider>` and `<ParticleBackground>`.
9. Storybook: add `ParticleBackground.stories.tsx` with light & dark variants.

DEFINITION OF DONE

- Running `pnpm dev`, dark‑mode toggle switches themes and Particle background renders.
- Lighthouse “Motion” audit passes reduced‑motion check.
- `pnpm lint`, `pnpm test`, `pnpm build` all succeed.

OUTPUT: Exact file diffs only.

````

---

#### Phase 2 – Landing page
```text
You are Cursor AI in the repo.

PHASE: 2 — Landing page

GOAL: Build the marketing landing (`/`) with hero, feature grid, live demo URL form.

TASKS
1. Create `components/Hero.tsx` containing:
   - Framer Motion typewriter headline cycling through ["Transcribe", "Summarise", "Navigate"].
   - CTA button `Get Started` that links to `/transcribe`.
2. Build `components/FeatureCard.tsx` (shadcn `Card`).
3. In `app/page.tsx` assemble hero, 3‑card feature grid, and `URLForm` (imported).
4. Add Framer page transitions by wrapping `children` in `AnimatePresence` in `app/layout.tsx`.
5. Ensure responsiveness: grid collapses to column at `sm`.
6. Test: Playwright script navigates to `/`, fills invalid URL → sees validation error.
7. Storybook stories for Hero and FeatureCard.

DEFINITION OF DONE
- `pnpm test:e2e` (Playwright) passes.
- Visual check: hero headline animates, Particle background visible under 30‑opacity overlay.

OUTPUT: Exact file diffs only.
````

---

#### Phase 3 – Transcribe page

```text
You are Cursor AI in the repo.

PHASE: 3 — Transcribe page

GOAL: Create `/transcribe` page with URL input, mock transcription progress, and recent list.

TASKS
1. Page skeleton at `app/transcribe/page.tsx`.
2. Place `<URLForm>` with Zod validation; on success call `simulateTranscription()`.
3. Implement `simulateTranscription` util returning Promise resolved in 2000 ms.
4. Show `<ProgressBar>` while pending.
5. On resolve, push `{ id: cuid(), videoId: parsedId, title: 'Mock Video' }` to Zustand store `useHistoryStore`.
6. Render `components/RecentVideos.tsx` listing history (max 5, newest first).
7. Toast notifications via `use-toast`.
8. Unit tests: URLForm validation (Vitest), state update.

DEFINITION OF DONE
- After form submit, progress bar animates then disappears and list updates.
- All tests green; lint/build passes.

OUTPUT: Exact file diffs only.
```

---

#### Phase 4 – Video viewer

```text
You are Cursor AI in the repo.

PHASE: 4 — Video viewer page

GOAL: Implement `/video/[videoId]` responsive viewer with VideoJS player, Transcript tab, Summary, Chapters.

TASKS
1. Install deps: `pnpm add react-player`.
2. Create dynamic route `app/video/[videoId]/page.tsx`.
3. Fetch mock transcript via local JSON (until backend ready).
4. Layout: CSS grid `lg:grid-cols-[40%_60%]` else flex col.
5. Tabs (shadcn) with `TranscriptViewer`, `SummaryCard`, `ChapterList`.
6. TranscriptViewer renders paragraphs; each timestamp button calls `playerRef.current.seekTo(sec, true)`.
7. Add Framer staggered animation for paragraph entries.
8. Playwright test: click third timestamp -> expect `seeked` event with correct seconds (mock player).

DEFINITION OF DONE
- Viewer page loads without console errors.
- Transcript lines clickable & active class updates on scroll.
- All tests + lint/build pass.

OUTPUT: Exact file diffs only.
```

---

#### Phase 5 – Dashboard & Settings

```text
You are Cursor AI in the repo.

PHASE: 5 — Dashboard & Settings

GOAL: Build user library (`/dashboard`) and preference panel (`/settings`).

TASKS
1. Install TanStack Table: `pnpm add @tanstack/react-table`.
2. `/dashboard/page.tsx` displays table of mock transcripts (from Zustand) with sortable columns Title, Date, Actions.
3. `/settings/page.tsx` includes:
   - `ThemeSwitcher`
   - API usage progress bar (static 40 %)
   - Button `Export JSON` downloading history via `URL.createObjectURL`.
4. Ensure colour tokens used (`bg-bg`, `text-fg`).
5. Tests: table sorting (Vitest DOM), theme persistence after page reload (Playwright).

DEFINITION OF DONE
- Table sorts asc/desc; settings toggle persists to `localStorage`.
- All tests, lint, build successful.

OUTPUT: Exact file diffs only.
```

---

#### Phase 6 – Testing & polish

```text
You are Cursor AI in the repo.

PHASE: 6 — Testing & polish

GOAL: Increase test coverage ≥ 90 %, Lighthouse Perf ≥ 95 %, final cleanup.

TASKS
1. Add unit tests covering uncovered lines/components.
2. Code‑split `/video/[id]` with dynamic import of TranscriptViewer.
3. Bundle analyse (`next build --profile`) and tree‑shake unused Framer Motion features.
4. Add `next/image` width/height props everywhere.
5. Prefetch Google fonts in `app/layout.tsx`.
6. Run `npm run lint --max-warnings 0` ensure none.
7. Update README with build/run instructions.

DEFINITION OF DONE
- `vitest --coverage` shows ≥ 90 % statements.
- `lighthouse-ci` (mobile, perf) ≥ 95 score.
- `pnpm build` output size < 250 kB JS (gzipped).

OUTPUT: Exact file diffs only.
```

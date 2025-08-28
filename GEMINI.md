# Project: Script Flow

## Project Overview

Script Flow is a Next.js web application designed to transcribe video content from YouTube. It leverages the Deepgram API for speech-to-text transcription and provides a user-friendly interface to view and interact with the generated transcripts. The application features include video playback alongside the transcript, auto-generated chapters for easy navigation, and AI-powered summarization of the video content.

The backend is built with Next.js API routes, utilizing Prisma as the ORM to interact with a PostgreSQL database. The database schema is designed to store transcriptions, user data, and related metadata. The frontend is built with React and Tailwind CSS, with components managed and showcased using Storybook.

### Core Features

-   **YouTube Video Transcription:** Users can submit a YouTube URL to receive a full transcript of the video.
-   **Interactive Transcript Viewer:** The transcript is synchronized with the video playback, allowing users to click on a word to jump to that point in the video.
-   **AI-Powered Summarization:** The application uses an AI service to generate a concise summary of the video content.
-   **Chapter Generation:** Key sections of the video are automatically identified and presented as chapters.
-   **Searchable Transcripts:** Transcripts are indexed for full-text search.
-   **User Dashboard:** A dashboard displays a history of all transcribed videos.
-   **Settings Page:** Users can customize their experience, including theme preferences.
-   **Caching:** Transcripts are cached using Redis to provide a faster experience for repeated requests.

## Building and Running

### Prerequisites

-   Node.js (v20 or later)
-   npm, yarn, or pnpm
-   PostgreSQL database
-   Deepgram API Key (optional, for real transcriptions)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd script-flow
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following:
    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    DEEPGRAM_API_KEY="YOUR_DEEPGRAM_API_KEY"
    REDIS_URL="redis://HOST:PORT"
    ```
    *Note: If you do not provide a `DEEPGRAM_API_KEY`, the application will run in a mock mode, which is useful for frontend development and testing.*

4.  **Run database migrations:**
    ```bash
    npx prisma migrate dev
    ```

### Key Commands

-   **Development:** Run the development server.
    ```bash
    npm run dev
    ```
-   **Building:** Create a production build.
    ```bash
    npm run build
    ```
-   **Running:** Start the production server.
    ```bash
    npm run start
    ```
-   **Testing:**
    -   Run unit tests:
        ```bash
        npm run test
        ```
    -   Run end-to-end tests:
        ```bash
        npm run test:e2e
        ```
-   **Linting:**
    ```bash
    npm run lint
    ```
-   **Storybook:**
    ```bash
    npm run storybook
    ```

## Development Conventions

-   **Styling:** The project uses Tailwind CSS for styling.
-   **Components:** Reusable UI components are developed and tested in isolation using Storybook.
-   **State Management:** The project uses Zustand for global state management, particularly for the user's history of transcribed videos.
-   **Testing:**
    -   Unit tests are written with Vitest and React Testing Library.
    -   End-to-end tests are written with Playwright.
-   **Database:** Prisma is used for all database interactions. Schema changes should be managed through Prisma migrations.
-   **Code Style:** The project uses Prettier for code formatting and ESLint for linting. A pre-commit hook is set up with Husky to ensure code quality before committing.
-   **API Routes:** Backend logic is implemented in Next.js API Routes within the `src/app/api` directory. Each route has a `route.ts` file that exports functions for the corresponding HTTP methods (e.g., `GET`, `POST`).
-   **Error Handling:** The application uses a centralized `handleAPIError` function to process and display user-friendly error messages.
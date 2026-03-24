# Prompt Architect

Transform voice recordings into optimized, platform-specific AI prompts.

**[Get Started](./docs/START_HERE.md)** | [Architecture](./docs/ARCHITECTURE.md) | [Deployment](./docs/DEPLOYMENT.md)

## Features

- **Voice-first input** — Upload audio recordings of your ideas
- **AI transcription** — Powered by Google Gemini
- **Task analysis** — Automatic classification, complexity scoring, capability detection
- **Smart routing** — Recommends the best AI platform and model for your task
- **Platform-optimized prompts** — Tailored for ChatGPT, Claude, Gemini, or generic use
- **Continuation workflow** — Pick up where you left off with revision and follow-up prompts
- **History & search** — Find and reuse previous requests
- **Mobile-friendly** — Responsive design that works on any device

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **AI**: Google Gemini (via @google/genai SDK)
- **Storage**: Local filesystem (S3-compatible adapter ready)
- **Validation**: Zod

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Set GEMINI_API_KEY in .env

# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev

# Start worker (separate terminal)
npm run worker:dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # REST API endpoints
│   ├── dashboard/         # Dashboard page
│   ├── requests/          # New request & detail pages
│   ├── history/           # History & search
│   ├── settings/          # Configuration
│   └── health/            # System health check
├── components/            # React components
│   ├── ui/               # Base UI (shadcn/ui)
│   ├── forms/            # Form components
│   ├── layout/           # Layout & navigation
│   └── shared/           # Shared components
├── lib/                   # Core logic
│   ├── adapters/         # Database, storage, queue adapters
│   ├── config/           # Environment & constants
│   ├── schemas/          # Zod schemas & types
│   ├── services/         # Gemini AI, recommendation engine
│   ├── templates/        # Prompt templates per platform
│   └── utils.ts          # Utility functions
└── workers/              # Background job processors
    └── processors/       # Audio processing pipeline
prisma/                   # Prisma schema & migrations
docs/                     # Documentation
```

## License

MIT

# Prompt Architect

Transform voice recordings into optimized, platform-specific AI prompts.

## Features

- **Voice-first input** — Upload audio recordings of your ideas
- **AI transcription** — Powered by Google Gemini 2.0 Flash
- **Task analysis** — Automatic classification, complexity scoring, capability detection
- **Smart routing** — Recommends the best AI platform and model for your task
- **Platform-optimized prompts** — Tailored for ChatGPT, Claude, Gemini, or generic use
- **Continuation workflow** — Pick up where you left off with follow-up and revision prompts
- **History** — Searchable, filterable history stored in your browser
- **Mobile-friendly** — Responsive design that works on any device

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui components
- **AI**: Google Gemini 2.0 Flash (via @google/genai SDK)
- **Validation**: Zod
- **Hosting**: Vercel (serverless)
- **History**: Browser localStorage

## Quick Start (Local)

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
# Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `MAX_AUDIO_SIZE_MB` | No | Max audio upload size (default: 25) |

## How It Works

1. Upload an audio file describing your task or idea
2. Gemini transcribes and cleans the audio
3. The system analyzes task type, complexity, and requirements
4. A platform-specific prompt is generated (ChatGPT, Claude, Gemini, or Generic)
5. Copy the prompt and use it in your preferred AI platform

## Architecture (Deployed)

This MVP runs entirely on Vercel serverless functions:

- **Processing**: Audio is sent to Gemini synchronously in the API route
- **Storage**: Request history persists in browser localStorage
- **No external DB/Redis required** — everything runs within Vercel + Gemini

### Production Evolution Path

For persistent multi-user storage, add:
- PostgreSQL (via Prisma ORM)
- Redis + BullMQ for async job processing
- Separate worker process for long audio files

## Project Structure

```
src/
├── app/                    # Next.js pages & API routes
│   ├── api/requests/       # Upload + process audio
│   ├── api/health/         # System health check
│   ├── dashboard/          # Home dashboard
│   ├── requests/new/       # Upload form
│   ├── requests/[id]/      # Result detail view
│   ├── history/            # Search & filter history
│   ├── settings/           # Configuration info
│   └── health/             # System status
├── components/             # React components (ui, forms, layout)
├── lib/
│   ├── adapters/db.ts      # In-memory request store
│   ├── config/             # Environment & constants
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Gemini AI + recommendation engine
│   ├── templates/          # Prompt templates per platform
│   ├── client-store.ts     # localStorage persistence
│   └── utils.ts            # Utility functions
```

## Limitations (MVP)

- Audio files up to ~25MB (Vercel serverless payload limit)
- Processing is synchronous (may time out for very long audio)
- History is stored in browser only (not synced across devices)
- Single-user mode (no authentication)
- No in-browser audio recording (upload only)

## License

MIT

# Start Here — Prompt Architect

## What is this?
Prompt Architect transforms voice recordings into optimized, platform-specific AI prompts. You speak your idea, and the system:
1. Transcribes your audio (via Google Gemini)
2. Classifies the task type and complexity
3. Recommends the best AI platform and model
4. Generates tailored prompts for your chosen platform
5. Saves everything to history for iteration

## Quick Start (Local Development)

### Prerequisites
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Node.js 20+** (for development)
- **Google Gemini API Key** — Get one at https://aistudio.google.com/apikey

### Steps

```bash
# 1. Clone and install
cd prompt-architect
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Set up database
npx prisma migrate deploy
npx prisma db seed

# 5. Start the web app
npm run dev

# 6. Start the worker (in a separate terminal)
npm run worker:dev

# 7. Open http://localhost:3000
```

### All-in-One Docker
```bash
# Set your API key
export GEMINI_API_KEY=your-key-here

# Start everything
docker compose up -d

# Run migrations
docker compose exec web npx prisma migrate deploy
```

## How to Use
1. Go to **New Request**
2. Upload an audio file (MP3, WAV, M4A, etc.)
3. Optionally select a target platform and add context
4. Click **Process Request**
5. Wait for processing (watch the progress bar)
6. View the full analysis and generated prompts
7. Copy the prompt to use in your AI platform

## Key Documentation
- [Architecture](./ARCHITECTURE.md) — System design decisions
- [Data Model](./DATA_MODEL.md) — Database schema
- [Processing Pipeline](./PROCESSING_PIPELINE.md) — How audio gets processed
- [Prompt Strategy](./PROMPT_STRATEGY.md) — How prompts are generated
- [Deployment](./DEPLOYMENT.md) — Production deployment guide
- [Next Steps](./NEXT_STEPS.md) — Future roadmap

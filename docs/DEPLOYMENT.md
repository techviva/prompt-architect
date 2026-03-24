# Deployment Guide — Prompt Architect

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for development without Docker)
- A Google Gemini API key

### Quick Start
```bash
# Clone the repository
git clone <repo-url> prompt-architect
cd prompt-architect

# Copy environment file
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start all services
docker compose up -d

# Run database migrations
docker compose exec web npx prisma migrate deploy

# Access the app
open http://localhost:3000
```

### Development Mode (without Docker)
```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (via Docker)
docker compose up -d postgres redis

# Set up database
npx prisma migrate dev

# Start the web app
npm run dev

# In a separate terminal, start the worker
npm run worker
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `STORAGE_ADAPTER` | No | `local` | Storage type: `local` or `s3` |
| `STORAGE_LOCAL_PATH` | No | `./uploads` | Local storage directory |
| `S3_ENDPOINT` | If S3 | - | S3-compatible endpoint URL |
| `S3_BUCKET` | If S3 | - | S3 bucket name |
| `S3_ACCESS_KEY` | If S3 | - | S3 access key |
| `S3_SECRET_KEY` | If S3 | - | S3 secret key |
| `S3_REGION` | If S3 | `auto` | S3 region |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL |
| `MAX_AUDIO_SIZE_MB` | No | `100` | Max audio upload size |
| `MAX_ATTACHMENT_SIZE_MB` | No | `25` | Max attachment size |

## Production Self-Hosted

### Docker Compose Production
```bash
# Use production compose file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### With MinIO (S3-compatible storage)
```bash
# Add MinIO to your compose or use external S3
STORAGE_ADAPTER=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=prompt-architect
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

### Reverse Proxy (Caddy example)
```
prompt-architect.example.com {
    reverse_proxy localhost:3000
}
```

## Cloud Deployment

### Frontend on Vercel
1. Connect repository to Vercel
2. Set environment variables (DATABASE_URL, REDIS_URL pointing to external services)
3. Deploy

Note: Worker must run separately — Vercel cannot host long-running processes.

### Backend/Worker on any VPS
```bash
# On your server
docker compose up -d postgres redis worker

# Or run worker directly
DATABASE_URL=... REDIS_URL=... GEMINI_API_KEY=... npm run worker
```

### Database Options
- Self-hosted PostgreSQL (Docker or bare metal)
- Supabase (free tier available)
- Neon (free tier available)
- Any PostgreSQL provider

### Redis Options
- Self-hosted Redis (Docker)
- Upstash (serverless Redis)
- Redis Cloud
- Any Redis provider

## Health Checks
- Web: `GET /api/health`
- Worker: Logs heartbeat every 30 seconds
- Database: Checked via health endpoint
- Redis: Checked via health endpoint

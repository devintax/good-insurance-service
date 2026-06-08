# Good Insurance Service - Lead Capture

A professional lead capture page for Good Insurance Agency that collects auto insurance quote requests and syncs them to ERPNext CRM.

## Features
- Multi-step quote request form (personal info → vehicle → coverage → review)
- PostgreSQL database for reliable lead storage
- ERPNext CRM sync with status tracking
- Admin API for viewing and managing leads

## Quick Start

```bash
# Clone the repo
git clone https://github.com/devintax/good-insurance-service.git
cd good-insurance-service

# Copy environment config
cp .env.example .env
# Edit .env with your ERPNext API credentials

# Start with Docker (recommended)
docker compose up -d

# Or run locally
npm install
node server.js    # API server on port 3000
npx vite --host   # Frontend on port 5173
```

## CI/CD

This repo includes:
- **GitHub Actions CI** - Lint, type-check, build on every push
- **Dockerfile** - For Coolify / Docker deployment
- **Docker Compose** - Full-stack local dev with PostgreSQL

## Deployment to Coolify

1. Connect your GitHub repo in Coolify
2. Select **Dockerfile** as the Build Pack
3. Set environment variables in Coolify dashboard
4. Deploy!

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `ERPNEXT_URL` | Your ERPNext instance URL |
| `ERPNEXT_API_KEY` | API key from ERPNext |
| `ERPNEXT_API_SECRET` | API secret from ERPNext |
| `DATABASE_URL` | PostgreSQL connection string |

## API Endpoints
- `POST /api/leads` - Submit a new lead
- `GET /api/leads` - List all leads (admin)
- `GET /api/sync` - Check ERPNext sync status
- `POST /api/sync` - Trigger manual sync to ERPNext
- `GET /api/health` - Health check

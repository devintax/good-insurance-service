$ErrorActionPreference = "Stop"

# GIA Quote Capture - Local Development
# Copy .env.example to .env and fill in real values before running.

$env:NODE_ENV = "development"
$env:PORT = "3005"
$env:VITE_API_URL = "http://localhost:3005"

Write-Host "Starting GIA Quote Capture server on port 3005..."
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -Wait &

Write-Host "Starting Vite dev server..."
pnpm run dev

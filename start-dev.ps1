$ErrorActionPreference = "Stop"
$nodePath = "C:\Program Files\nodejs"

$env:PATH = "$nodePath;$env:PATH"
$env:ERPNEXT_URL = "https://erpnext.dfgworld.net"
$env:ERPNEXT_API_KEY = "eb467ed5754f2c8"
$env:ERPNEXT_API_SECRET = "3be7e47d72aafbd"
$env:VITE_API_URL = ""

$projectDir = "C:\Users\Administrator.DFGWORLD\Documents\GISWEB\good-insurance-leads\good-insurance-leads"

Write-Host "Starting API server on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $projectDir -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "Starting Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "npx" -ArgumentList "vite", "--host" -WorkingDirectory $projectDir -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Servers started:" -ForegroundColor Green
Write-Host "  - API Server: http://localhost:3000" -ForegroundColor Yellow
Write-Host "  - Frontend:   http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Gray
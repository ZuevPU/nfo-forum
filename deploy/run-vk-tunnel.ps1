# Start VK Tunnel for local Mini App testing (app 54627015)
param(
  [int]$Port = 5173
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"

Write-Host "=== VK Tunnel (port $Port) ==="
Write-Host "1. Start frontend first: npm run dev:frontend"
Write-Host "2. If Vite uses another port, pass -Port 5174"
Write-Host "3. Complete OAuth in browser when prompted"
Write-Host "4. Copy tunnel URL to dev.vk.com -> Razmeshchenie (mobile/web/mvk)"
Write-Host ""

Set-Location $frontend
npx vk-tunnel --insecure=1 --http-protocol=https --ws-protocol=wss --host=0.0.0.0 --port=$Port

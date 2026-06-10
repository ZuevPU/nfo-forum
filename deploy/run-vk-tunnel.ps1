# Start VK Tunnel with pre-flight check (VK may return Access denied if service disabled).
param(
  [int]$Port = 5173,
  [switch]$ResetAuth
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$tunnelStore = Join-Path $env:USERPROFILE ".config\configstore\@vkontakte\vk-tunnel.json"

if ($ResetAuth -and (Test-Path $tunnelStore)) {
  Remove-Item $tunnelStore -Force
  Write-Host "Removed stale tunnel OAuth cache."
}

Write-Host "=== VK Tunnel pre-flight ==="
Set-Location $root
node deploy/diagnose-vk-tunnel.mjs
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "VK Tunnel API returned Access denied (error 15)."
  Write-Host "Since Oct 2025 VK Tunnel is often disabled on VK servers."
  Write-Host ""
  Write-Host "Use Cloudflare tunnel instead:"
  Write-Host "  npm run tunnel:local"
  Write-Host "  (or: npm run tunnel:local -- -Port 5174 if Vite uses another port)"
  Write-Host ""
  Write-Host "Then paste the https://....trycloudflare.com URL into dev.vk.com -> Razmeshchenie."
  exit 1
}

Write-Host "=== VK Tunnel (port $Port) ==="
Write-Host "Complete OAuth in browser BEFORE pressing Enter in terminal."
Set-Location $frontend
npx vk-tunnel --insecure=1 --http-protocol=https --ws-protocol=wss --host=0.0.0.0 --port=$Port

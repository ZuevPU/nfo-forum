# Backend deploy helper for Timeweb Cloud (no Railway)
# Timeweb redeploy is done via their panel or git hook — this script prepares the build and DB.
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-d400.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== Timeweb backend deploy prep ==="
Write-Host "API URL: $ApiUrl"
Write-Host ""

Write-Host "1/3 Build backend..."
npm run build:backend
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }

Write-Host ""
Write-Host "2/3 Apply pending DB migrations..."
Push-Location backend
npm run db:migrate
$migrateExit = $LASTEXITCODE
Pop-Location
if ($migrateExit -ne 0) {
  Write-Host "WARNING: db:migrate failed (check DATABASE_URL in backend/.env)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3/3 Redeploy on Timeweb Cloud:"
Write-Host "  - Open Timeweb panel -> your Node/Docker app -> Redeploy / Restart"
Write-Host "  - Or push to the branch connected to Timeweb git deploy"
Write-Host "  - Env vars: see .env.production.example (SKIP_VK_SIGN=false, API_PUBLIC_URL=$ApiUrl)"
Write-Host ""
Write-Host "Verify after redeploy:"
Write-Host "  npm run verify:prod"
Write-Host "  curl $ApiUrl/api/health"

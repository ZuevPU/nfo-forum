# Deploy backend to Railway (fallback when Fly.io billing is unavailable)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  npm install -g @railway/cli
}

$envFile = Join-Path (Get-Location) ".env.production"
if (-not (Test-Path $envFile)) {
  throw "Create .env.production from .env.production.example"
}

function Get-EnvValue([string]$name) {
  Get-Content $envFile | Where-Object { $_ -match "^\s*$name=" } | ForEach-Object {
    ($_ -replace "^\s*$name=", '').Trim().Trim('"')
  } | Select-Object -First 1
}

Write-Host "=== Railway backend deploy ==="
if (-not (Test-Path (Join-Path (Get-Location) ".railway\config.json"))) {
  railway init --name nfo-forum-api
}
if (-not (railway status 2>&1 | Select-String "Service:" | Select-String -NotMatch "None")) {
  railway add --service nfo-backend 2>$null
}

$vars = @("DATABASE_URL", "VK_APP_SECRET", "VK_GROUP_TOKEN", "VK_GROUP_ID", "CRON_SECRET")
foreach ($v in $vars) {
  $val = Get-EnvValue $v
  if (-not $val) { throw "Missing $v" }
  railway variables set "${v}=$val" | Out-Null
}
railway variables set "NODE_ENV=production" | Out-Null
railway variables set "SKIP_VK_SIGN=false" | Out-Null
railway variables set "FRONTEND_ORIGIN=https://vk.com" | Out-Null
railway variables set "PORT=3001" | Out-Null

railway up --detach
$url = railway domain 2>&1
Write-Host "Backend URL: $url"

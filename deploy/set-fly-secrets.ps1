# Sets Fly.io secrets from .env.production in repo root (never commit that file).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.production"
if (-not (Test-Path $envFile)) {
  throw "Create $envFile from .env.production.example with production values."
}

function Get-EnvValue([string]$name) {
  Get-Content $envFile | Where-Object { $_ -match "^\s*$name=" } | ForEach-Object {
    ($_ -replace "^\s*$name=", '').Trim().Trim('"')
  } | Select-Object -First 1
}

$vars = @(
  "DATABASE_URL",
  "VK_APP_SECRET",
  "VK_GROUP_TOKEN",
  "VK_GROUP_ID",
  "CRON_SECRET"
)
$secretArgs = @()
foreach ($v in $vars) {
  $val = Get-EnvValue $v
  if (-not $val) { throw "Missing $v in $envFile" }
  $secretArgs += "${v}=$val"
}

Write-Host "Setting Fly secrets for app nfo-forum-api..."
flyctl secrets set @secretArgs --app nfo-forum-api
Write-Host "Done."

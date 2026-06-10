# Deploy frontend to VK Hosting via @vkontakte/vk-miniapps-deploy
param(
  [string]$AppId = "",
  [string]$ApiUrl = "https://nfo-backend-production.up.railway.app",
  [ValidateSet("dev", "production")]
  [string]$Environment = "dev"
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Get-EnvValue([string]$name, [string]$file) {
  if (-not (Test-Path $file)) { return $null }
  Get-Content $file | Where-Object { $_ -match "^\s*$name=" } | ForEach-Object {
    ($_ -replace "^\s*$name=", '').Trim().Trim('"')
  } | Select-Object -First 1
}

$envFile = Join-Path $root ".env.production"
if (-not $AppId) { $AppId = Get-EnvValue "VK_APP_ID" $envFile }
if (-not $AppId) { $AppId = $env:VK_APP_ID }
if (-not $AppId) {
  throw @"
VK_APP_ID is required.

Find it in https://dev.vk.com/ru/mini-apps/settings -> your app -> Settings (numeric ID).
Then either:
  .\deploy\deploy-vk-hosting.ps1 -AppId YOUR_APP_ID
or add to .env.production:
  VK_APP_ID=YOUR_APP_ID
"@
}

Write-Host "=== Build frontend (VITE_API_URL=$ApiUrl) ==="
& (Join-Path $PSScriptRoot "build-frontend.ps1") -ApiUrl $ApiUrl

Write-Host "=== Deploy to VK Hosting (app_id=$AppId, mode=$Environment) ==="
Write-Host "Using curl upload (node-fetch fails on Windows with ECONNRESET)."
if ($Environment -eq "dev") {
  Write-Host "Dev mode: no admin confirm code required."
} else {
  Write-Host "Production mode: may require confirm code from VK Administration."
}
Write-Host ""

Set-Location $root
$env:MINI_APPS_APP_ID = $AppId
$env:MINI_APPS_ENVIRONMENT = $Environment
node (Join-Path $PSScriptRoot "deploy-vk-curl.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

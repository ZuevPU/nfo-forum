# Post-deploy verification against production API
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-9945.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:API_URL = $ApiUrl
if (Test-Path ".env.production") {
  $cron = Get-Content ".env.production" | Where-Object { $_ -match '^\s*CRON_SECRET=' } | ForEach-Object { ($_ -replace '^\s*CRON_SECRET=', '').Trim() } | Select-Object -First 1
  if ($cron) { $env:CRON_SECRET = $cron }
}

Write-Host "=== Smoke test: $ApiUrl ==="
& "$PSScriptRoot\..\scripts\smoke-test.ps1"
Write-Host ""
Write-Host "=== VK checklist (API) ==="
& "$PSScriptRoot\..\scripts\vk-checklist.ps1"

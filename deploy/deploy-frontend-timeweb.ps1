# Timeweb frontend deploy prep (build dist + upload reminder)
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-d400.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== Timeweb frontend deploy prep ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host ""

Write-Host "1/2 Build frontend..." -ForegroundColor Yellow
& "$PSScriptRoot\build-frontend.ps1" -ApiUrl $ApiUrl

Write-Host ""
Write-Host "2/2 Upload to Timeweb:" -ForegroundColor Yellow
Write-Host "  - Open Timeweb panel -> static app / file manager"
Write-Host "  - Upload contents of frontend/dist (index.html + assets/)"
Write-Host "  - Ensure HTTPS URL serves index.html at root"
Write-Host ""
Write-Host "VK Mini App -> Размещение:" -ForegroundColor Yellow
Write-Host "  - Set mobile / web / mvk URLs to your Timeweb frontend URL"
Write-Host "  - Do NOT use backend URL (*.twc1.net)"
Write-Host ""
Write-Host "Checklist: deploy/VK_CABINET_CHECKLIST.md"
Write-Host "Content setup: deploy/ADMIN_CONTENT.md"

# Production frontend build for Timeweb static hosting
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-9945.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:VITE_API_URL = $ApiUrl
Write-Host "Building frontend with VITE_API_URL=$ApiUrl"
npm run build:frontend
Write-Host "Output: frontend/dist (upload to Timeweb static, then set URL in dev.vk.com Размещение)"

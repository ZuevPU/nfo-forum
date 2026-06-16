# Production frontend build for VK Hosting
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-d400.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:VITE_API_URL = $ApiUrl
Write-Host "Building frontend with VITE_API_URL=$ApiUrl"
npm run build:frontend
Write-Host "Output: frontend/dist (zip and upload to VK Mini Apps)"

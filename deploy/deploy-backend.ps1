# Deploy backend to Fly.io (requires: flyctl auth login)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== Fly.io backend deploy ==="
if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
  throw "Install flyctl: winget install Fly-io.flyctl"
}

$whoami = flyctl auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Run: flyctl auth login"
}

if (-not (flyctl apps list 2>$null | Select-String "nfo-forum-api")) {
  Write-Host "Creating app nfo-forum-api..."
  flyctl apps create nfo-forum-api --org personal 2>$null
}

if (Test-Path ".env.production") {
  Write-Host "Setting secrets from .env.production..."
  & "$PSScriptRoot\set-fly-secrets.ps1"
}

flyctl deploy --app nfo-forum-api
Write-Host "Backend URL: https://nfo-forum-api.fly.dev"

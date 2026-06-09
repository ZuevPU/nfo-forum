# Create GitHub repo and push (requires: gh auth login)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  winget install GitHub.cli -e --accept-source-agreements --accept-package-agreements
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: gh auth login -h github.com -p https -w"
  gh auth login -h github.com -p https -w
}

if (-not (git remote get-url origin 2>$null)) {
  gh repo create nfo-forum --private --source=. --remote=origin --push
} else {
  git push -u origin main
}

Write-Host "Repo URL:" (gh repo view --json url -q .url)

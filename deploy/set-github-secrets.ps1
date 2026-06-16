# Set GitHub Actions secrets for cron (requires: gh auth login)
param(
  [string]$ApiUrl = "https://zuevpu-nfo-forum-d400.twc1.net"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "Install GitHub CLI: winget install GitHub.cli"
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Run: gh auth login -h github.com -p https -w"
}

$cron = $null
foreach ($envFile in @(".env.production", "backend\.env")) {
  if (-not (Test-Path $envFile)) { continue }
  $cron = Get-Content $envFile | Where-Object { $_ -match '^\s*CRON_SECRET=' } | ForEach-Object { ($_ -replace '^\s*CRON_SECRET=', '').Trim() } | Select-Object -First 1
  if ($cron) { break }
}
if (-not $cron) { throw "CRON_SECRET missing in .env.production or backend/.env" }

gh secret set API_URL --body $ApiUrl
gh secret set CRON_SECRET --body $cron
Write-Host "GitHub secrets set. Test: gh workflow run cron.yml -f job_name=morning-greeting"

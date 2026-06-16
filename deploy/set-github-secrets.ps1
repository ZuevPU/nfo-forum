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

function Get-CronSecret([string]$envFile) {
  if (-not (Test-Path $envFile)) { return $null }
  Get-Content $envFile | Where-Object { $_ -match '^\s*CRON_SECRET=' } | ForEach-Object {
    ($_ -replace '^\s*CRON_SECRET=', '').Trim()
  } | Select-Object -First 1
}

function Test-CronSecret([string]$secret) {
  try {
    $r = Invoke-WebRequest -Uri "$ApiUrl/api/cron/morning-greeting" -Method POST `
      -Headers @{ "X-Cron-Secret" = $secret } -UseBasicParsing -TimeoutSec 20
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

$cron = $null
foreach ($envFile in @("backend\.env", ".env.production")) {
  $candidate = Get-CronSecret $envFile
  if (-not $candidate) { continue }
  if (Test-CronSecret $candidate) {
    $cron = $candidate
    Write-Host "Using CRON_SECRET from $envFile (verified against $ApiUrl)"
    break
  }
  Write-Host "CRON_SECRET from $envFile did not verify, trying next file..."
}

if (-not $cron) {
  throw "No working CRON_SECRET found in backend/.env or .env.production for $ApiUrl"
}

gh secret set API_URL --body $ApiUrl
gh secret set CRON_SECRET --body $cron
Write-Host "GitHub secrets set."

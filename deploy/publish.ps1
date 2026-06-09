# Master publish script — run steps in order
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host @"
=== NFO Forum publish ===

Blockers encountered in this environment:
- Fly.io: requires billing card at https://fly.io/dashboard
- Railway CLI upload: connection reset (use GitHub deploy instead)
- GitHub CLI: run 'gh auth login' with device code when prompted

Steps:
1. gh auth login -h github.com -p https -w
2. .\deploy\setup-github.ps1
3. Either:
   a) Add Fly billing, then .\deploy\deploy-backend.ps1
   b) Railway GitHub deploy:
      railway service source connect --repo YOUR_USER/nfo-forum --branch main --service nfo-backend
4. .\deploy\build-frontend.ps1 -ApiUrl YOUR_BACKEND_URL
5. .\deploy\package-vk-frontend.ps1
6. Upload frontend-dist.zip to VK Mini Apps
7. See deploy/VK_SETUP.md
8. .\deploy\set-github-secrets.ps1 -ApiUrl YOUR_BACKEND_URL
9. .\deploy\verify-production.ps1 -ApiUrl YOUR_BACKEND_URL
10. Manual: scripts/VK_DEVTOOLS_CHECKLIST.md
"@

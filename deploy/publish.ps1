# Master publish script — run steps in order
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host @"
=== NFO Forum publish ===

Backend: Timeweb Cloud (https://zuevpu-nfo-forum-d400.twc1.net)
Frontend: VK Hosting

Steps:
1. gh auth login -h github.com -p https -w   # optional, for cron secrets
2. .\deploy\setup-github.ps1                  # optional
3. npm run deploy:backend                     # build + DB migrations + Timeweb redeploy hint
4. .\deploy\build-frontend.ps1 -ApiUrl https://zuevpu-nfo-forum-d400.twc1.net
5. npm run deploy:vk:dev
6. See deploy/VK_SETUP.md and deploy/VK_CABINET_CHECKLIST.md
7. .\deploy\set-github-secrets.ps1 -ApiUrl https://zuevpu-nfo-forum-d400.twc1.net
8. npm run verify:prod
9. Manual: scripts/VK_DEVTOOLS_CHECKLIST.md

Optional Fly.io backend: .\deploy\deploy-backend.ps1 (requires flyctl + billing)
"@

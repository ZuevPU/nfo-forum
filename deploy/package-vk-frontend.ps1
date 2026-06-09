# Package frontend/dist for VK Mini Apps upload
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$dist = Join-Path (Get-Location) "frontend\dist"
if (-not (Test-Path $dist)) {
  throw "Run deploy/build-frontend.ps1 first"
}

$zip = Join-Path (Get-Location) "frontend-dist.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip
Write-Host "Created $zip - upload to https://vk.com/apps?act=manage"

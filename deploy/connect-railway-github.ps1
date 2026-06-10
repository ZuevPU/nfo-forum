# Connect Railway service to GitHub repo and trigger deploy (no local upload)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$projectId = "5c4e619c-696a-4f4b-9fd6-0d6563f55b0e"
$environmentId = "482457ac-46a7-4f01-954f-a42260218a11"
$serviceId = "55082597-2cb4-49be-b837-7d437c5376f4"
$repo = "ZuevPU/nfo-forum"
$branch = "main"

$configPath = Join-Path $env:USERPROFILE ".railway\config.json"
if (-not (Test-Path $configPath)) {
  throw "Run 'railway login' first"
}
$accessToken = (Get-Content $configPath | ConvertFrom-Json).user.accessToken
$headers = @{
  Authorization = "Bearer $accessToken"
  "Content-Type" = "application/json"
}

function Invoke-RailwayGql([string]$query) {
  $bodyPath = Join-Path $env:TEMP "railway-gql.json"
  @{ query = $query } | ConvertTo-Json -Compress | Set-Content $bodyPath -Encoding utf8
  $raw = curl.exe -s -X POST "https://backboard.railway.com/graphql/v2" `
    -H "Authorization: Bearer $accessToken" `
    -H "Content-Type: application/json" `
    --data-binary "@$bodyPath"
  $resp = $raw | ConvertFrom-Json
  if ($resp.errors) {
    $msg = ($resp.errors | ForEach-Object { $_.message }) -join "; "
    throw $msg
  }
  return $resp.data
}

Write-Host "=== Connect $repo to Railway service ==="
Write-Host "If this fails with 'User does not have access to the repo':"
Write-Host "  GitHub -> Settings -> Applications -> Railway -> Configure -> select nfo-forum"
Write-Host ""

$connect = Invoke-RailwayGql @"
mutation {
  serviceConnect(
    id: "$serviceId"
    input: { branch: "$branch", repo: "$repo" }
  ) { id name }
}
"@
Write-Host "Connected: $($connect.serviceConnect.name)"

Write-Host "=== Trigger deploy from GitHub ==="
$deploymentId = Invoke-RailwayGql @"
mutation {
  serviceInstanceDeployV2(
    serviceId: "$serviceId"
    environmentId: "$environmentId"
  )
}
"@
Write-Host "Deploy triggered: $deploymentId"
Write-Host "Backend URL: https://nfo-backend-production.up.railway.app"
Write-Host "Check status: railway logs -s nfo-backend"

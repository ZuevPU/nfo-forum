# Expose local Vite dev server via Cloudflare Quick Tunnel (VK Tunnel replacement).
param(
  [int]$Port = 0
)
$ErrorActionPreference = "Stop"

function Test-VitePort {
  param([int]$ProbePort)
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$ProbePort/" -UseBasicParsing -TimeoutSec 2
    return ($r.StatusCode -eq 200 -and $r.Content -match '@vite/client')
  } catch {
    return $false
  }
}

function Find-VitePorts {
  $found = @()
  foreach ($p in 5173..5185) {
    if (Test-VitePort -ProbePort $p) { $found += $p }
  }
  return $found
}

function Resolve-TunnelPort {
  param([int]$RequestedPort)
  $vitePorts = Find-VitePorts

  if ($vitePorts.Count -eq 0) {
    throw "No Vite dev server found on ports 5173-5185. Start frontend first: npm run dev:frontend"
  }

  if ($vitePorts.Count -gt 1) {
    Write-Host "WARNING: Multiple Vite instances: $($vitePorts -join ', ')"
    Write-Host "         Close extra terminals or stop stale 'npm run dev:frontend' processes."
    Write-Host ""
  }

  if ($RequestedPort -gt 0) {
    if ($RequestedPort -in $vitePorts) { return $RequestedPort }
    throw "Port $RequestedPort is not an active Vite server. Active: $($vitePorts -join ', '). Use: npm run tunnel:local -- -Port $($vitePorts[-1])"
  }

  $chosen = $vitePorts[-1]
  if ($vitePorts.Count -gt 1) {
    Write-Host "Auto-selected Vite port $chosen (newest). Override: npm run tunnel:local -- -Port <port>"
    Write-Host ""
  }
  return $chosen
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  throw "cloudflared not found. Install: winget install Cloudflare.cloudflared"
}

$Port = Resolve-TunnelPort -RequestedPort $Port
$origin = "http://127.0.0.1:$Port"
Write-Host "=== Local HTTPS tunnel (Cloudflare) ==="
Write-Host "Target: $origin"
Write-Host ""

# Stop stale tunnels (multiple instances cause 502)
$existing = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Stopping $($existing.Count) stale cloudflared process(es)..."
  $existing | Stop-Process -Force
  Start-Sleep -Seconds 2
}

try {
  Invoke-WebRequest -Uri $origin -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  throw "Nothing responds on $origin. Start frontend first: npm run dev:frontend"
}

try {
  $probeHost = Invoke-WebRequest -Uri $origin -Headers @{ Host = "test.trycloudflare.com" } -UseBasicParsing -TimeoutSec 5
  if ($probeHost.StatusCode -ge 400) {
    throw "Vite rejected tunnel Host header (HTTP $($probeHost.StatusCode)). Restart dev:frontend after vite.config.ts update."
  }
} catch [System.Net.WebException] {
  $status = $_.Exception.Response.StatusCode.value__
  throw "Vite blocks trycloudflare.com Host (HTTP $status). In frontend/vite.config.ts set server.allowedHosts, then restart: npm run dev:frontend"
}

Write-Host "Origin OK. Starting cloudflared (--protocol http2)..."
Write-Host ""
Write-Host "IMPORTANT: Each restart creates a NEW https://....trycloudflare.com URL."
Write-Host "           Paste the fresh URL into dev.vk.com -> Razmeshchenie (all 3 fields)."
Write-Host "           Old tunnel URLs return 502 Bad Gateway."
Write-Host ""

& cloudflared tunnel --protocol http2 --url $origin

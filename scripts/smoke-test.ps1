$ErrorActionPreference = "Stop"
$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3001" }
$VkId = if ($env:VK_ID) { $env:VK_ID } else { "test_stage1_f4fdfab2" }
$CronSecret = $env:CRON_SECRET
$TimeoutSec = 15
$Headers = @{ "X-Vk-Id" = $VkId }

function Invoke-WithRetry {
  param(
    [scriptblock]$Action,
    [int]$MaxAttempts = 3
  )
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      return & $Action
    } catch {
      if ($i -eq $MaxAttempts) { throw }
      Write-Host "   Retry $i/$MaxAttempts..."
      Start-Sleep -Seconds 3
    }
  }
}

Write-Host "=== Smoke test: $ApiUrl ==="

Write-Host "1. Health check..."
$h = Invoke-WithRetry { Invoke-RestMethod -Uri "$ApiUrl/api/health" -TimeoutSec $TimeoutSec }
if ($h.status -ne "ok") { throw "Health failed" }
Write-Host "   OK"

Write-Host "2. Login..."
$login = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ vk_id = $VkId } | ConvertTo-Json) -TimeoutSec $TimeoutSec
}
Write-Host "   OK (registered=$($login.registered))"

Write-Host "3. Home..."
$homeData = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/home" -Headers $Headers -TimeoutSec $TimeoutSec
}
if (-not $homeData.user) { throw "Home failed" }
Write-Host "   OK"

Write-Host "4. Events..."
$ev = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/events?track=all" -Headers $Headers -TimeoutSec $TimeoutSec
}
Write-Host "   OK ($($ev.events.Count) events)"

Write-Host "5. Tasks..."
$tasks = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/tasks" -Headers $Headers -TimeoutSec $TimeoutSec
}
Write-Host "   OK ($($tasks.tasks.Count) tasks)"

Write-Host "6. Exchange feed..."
$feed = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/exchange/feed" -Headers $Headers -TimeoutSec $TimeoutSec
}
Write-Host "   OK ($($feed.feed.Count) items)"

Write-Host "7. State checkin..."
$checkin = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$ApiUrl/api/state/checkin" -Method POST -Headers $Headers -ContentType "application/json" -Body (@{ emotion = "ok"; energy_level = 4 } | ConvertTo-Json) -TimeoutSec $TimeoutSec
}
if (-not $checkin.checkin) { throw "Checkin failed" }
Write-Host "   OK"

if ($CronSecret) {
  Write-Host "8. Cron jobs list..."
  $cronHeaders = @{ "X-Cron-Secret" = $CronSecret }
  $cron = Invoke-WithRetry {
    Invoke-RestMethod -Uri "$ApiUrl/api/cron/jobs" -Headers $cronHeaders -TimeoutSec $TimeoutSec
  }
  Write-Host "   OK ($($cron.jobs.Count) jobs)"

  Write-Host "9. Cron morning-greeting..."
  Invoke-WithRetry {
    Invoke-RestMethod -Uri "$ApiUrl/api/cron/morning-greeting" -Method POST -Headers $cronHeaders -TimeoutSec $TimeoutSec
  } | Out-Null
  Write-Host "   OK"
} else {
  Write-Host "8-9. Cron tests skipped (set CRON_SECRET to test)"
}

Write-Host "=== All smoke tests passed ==="

# API-testable subset of VK_DEVTOOLS_CHECKLIST.md
$ErrorActionPreference = "Stop"
$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3001" }
$VkId = if ($env:VK_ID) { $env:VK_ID } else { "test_stage1_f4fdfab2" }
$Headers = @{ "X-Vk-Id" = $VkId }

Write-Host "=== VK Checklist (API automation) ==="
Write-Host "Manual steps (VK iframe, photo upload, push delivery) - see scripts/VK_DEVTOOLS_CHECKLIST.md"
Write-Host ""

$passed = 0
$failed = 0

function Test-Step($name, $script) {
  Write-Host "[ ] $name"
  $ok = $false
  for ($i = 1; $i -le 3; $i++) {
    try {
      & $script
      $ok = $true
      break
    } catch {
      if ($i -lt 3) { Start-Sleep -Seconds 2 } else { Write-Host "    FAIL: $_" }
    }
  }
  if ($ok) {
    Write-Host "    PASS"
    $script:passed++
  } else {
    $script:failed++
  }
}

Test-Step "Health" { Invoke-RestMethod -Uri "$ApiUrl/api/health" -TimeoutSec 10 | Out-Null }
Test-Step "Login/Register flow" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ vk_id = $VkId } | ConvertTo-Json)
  if (-not $r.registered) { throw "user not registered" }
}
Test-Step "Home dashboard" {
  $h = Invoke-RestMethod -Uri "$ApiUrl/api/home" -Headers $Headers
  if (-not $h.user) { throw "no user" }
}
Test-Step "Schedule events" {
  $e = Invoke-RestMethod -Uri "$ApiUrl/api/events?track=all" -Headers $Headers
  if ($e.events.Count -lt 1) { throw "no events" }
}
Test-Step "Exchange create (pending)" {
  $q = Invoke-RestMethod -Uri "$ApiUrl/api/exchange/questions" -Method POST -Headers $Headers -ContentType "application/json" -Body (@{ text = "Test question $(Get-Date -Format o)"; scope = "all" } | ConvertTo-Json)
  if (-not $q.id) { throw "no question id" }
}
Test-Step "Exchange feed" {
  Invoke-RestMethod -Uri "$ApiUrl/api/exchange/feed" -Headers $Headers | Out-Null
}
Test-Step "Tasks list" {
  Invoke-RestMethod -Uri "$ApiUrl/api/tasks" -Headers $Headers | Out-Null
}
Test-Step "State checkin" {
  Invoke-RestMethod -Uri "$ApiUrl/api/state/checkin" -Method POST -Headers $Headers -ContentType "application/json" -Body (@{ emotion = "good"; energy_level = 3 } | ConvertTo-Json) | Out-Null
}
Test-Step "Rating" {
  Invoke-RestMethod -Uri "$ApiUrl/api/rating?scope=track" -Headers $Headers | Out-Null
}
Test-Step "Reflection questions" {
  Invoke-RestMethod -Uri "$ApiUrl/api/reflection/questions" -Headers $Headers | Out-Null
}

Write-Host ""
Write-Host ("=== Results: {0} passed, {1} failed ===" -f $passed, $failed)
if ($failed -gt 0) { exit 1 }

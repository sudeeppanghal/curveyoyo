$token = 'vcp_4ww9oeo6rMdGPyG74C7JcjrKTNE41ghjNROxJdeR7y9xzNJGLp1UUEL1'
$headers = @{ 'Authorization' = "Bearer $token" }

# Get latest deployments
$deps = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=curveyoyo&limit=3' -Headers $headers
Write-Host "=== Recent Deployments ===" -ForegroundColor Cyan
$deps.deployments | ForEach-Object {
    Write-Host "  $($_.uid) state=$($_.state) created=$($_.createdAt)" -ForegroundColor White
}

$dep = $deps.deployments[0]
Write-Host ""
Write-Host "=== Fetching logs for: $($dep.uid) ===" -ForegroundColor Cyan

# Get build logs
$logsUrl = "https://api.vercel.com/v3/deployments/$($dep.uid)/events?types=error"
try {
    $events = Invoke-RestMethod -Uri $logsUrl -Headers $headers
    if ($events.Count -eq 0) {
        Write-Host "No error events found in build logs." -ForegroundColor Yellow
    } else {
        $events | ForEach-Object { Write-Host $_.text -ForegroundColor Red }
    }
} catch {
    Write-Host "Could not fetch build logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check env vars currently set
Write-Host ""
Write-Host "=== Env Vars Currently on Project ===" -ForegroundColor Cyan
$envs = Invoke-RestMethod -Uri 'https://api.vercel.com/v10/projects/curveyoyo/env' -Headers $headers
$envs.envs | ForEach-Object {
    Write-Host "  $($_.key) [$($_.target -join ',')] = $($_.value.Substring(0, [Math]::Min(20, $_.value.Length)))..." -ForegroundColor White
}

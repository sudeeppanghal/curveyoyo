$token = 'vcp_4ww9oeo6rMdGPyG74C7JcjrKTNE41ghjNROxJdeR7y9xzNJGLp1UUEL1'
$headers = @{ 'Authorization' = "Bearer $token" }

# Get latest deployment
$deps = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=curveyoyo&limit=1' -Headers $headers
$dep = $deps.deployments[0]
Write-Host "Deployment: $($dep.uid) state=$($dep.state) commit=$($dep.meta.githubCommitSha)" -ForegroundColor Cyan
Write-Host "URL: $($dep.url)" -ForegroundColor White
Write-Host ""

# Get runtime logs
Write-Host "=== Runtime Logs ===" -ForegroundColor Yellow
$logUrl = "https://api.vercel.com/v3/deployments/$($dep.uid)/events"
$response = Invoke-WebRequest -Uri $logUrl -Headers $headers -UseBasicParsing
$lines = $response.Content -split "`n"
foreach ($line in $lines) {
    if ($line.Trim() -eq "") { continue }
    try {
        $obj = $line | ConvertFrom-Json
        $text = $obj.text
        if ($text -match "error|Error|ERROR|warn|crash|fail|FAIL|TypeError|Cannot|undefined|null") {
            Write-Host $text -ForegroundColor Red
        }
    } catch {}
}

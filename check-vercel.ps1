$token = 'vcp_4ww9oeo6rMdGPyG74C7JcjrKTNE41ghjNROxJdeR7y9xzNJGLp1UUEL1'
$headers = @{ 'Authorization' = "Bearer $token" }

Write-Host "=== All Recent Deployments ===" -ForegroundColor Cyan
$deps = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=curveyoyo&limit=5' -Headers $headers
foreach ($d in $deps.deployments) {
    $sha = if ($d.meta.githubCommitSha) { $d.meta.githubCommitSha.Substring(0,7) } else { "unknown" }
    Write-Host "  $($d.uid) state=$($d.state) sha=$sha target=$($d.target)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Current env var values (first 30 chars) ===" -ForegroundColor Cyan
$envs = Invoke-RestMethod -Uri 'https://api.vercel.com/v10/projects/curveyoyo/env' -Headers $headers
foreach ($e in $envs.envs) {
    $val = if ($e.value.Length -gt 30) { $e.value.Substring(0,30) + "..." } else { $e.value }
    Write-Host "  $($e.key) = $val" -ForegroundColor White
}

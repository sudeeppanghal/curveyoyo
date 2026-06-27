$vercelToken = 'vcp_4ww9oeo6rMdGPyG74C7JcjrKTNE41ghjNROxJdeR7y9xzNJGLp1UUEL1'
$githubToken = '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'

$vercelHeaders = @{ 'Authorization' = "Bearer $vercelToken"; 'Content-Type' = 'application/json' }
$githubHeaders = @{ 'Authorization' = "Bearer $githubToken"; 'Accept' = 'application/vnd.github.v3+json' }

# Step 1: Get GitHub repo ID
Write-Host "Getting GitHub repo info..." -ForegroundColor Cyan
$repo = Invoke-RestMethod -Uri 'https://api.github.com/repos/sudeeppanghal/curveyoyo' -Headers $githubHeaders
Write-Host "Repo ID: $($repo.id)  Full: $($repo.full_name)" -ForegroundColor White

# Step 2: Get latest commit SHA on main
$branch = Invoke-RestMethod -Uri 'https://api.github.com/repos/sudeeppanghal/curveyoyo/branches/main' -Headers $githubHeaders
$sha = $branch.commit.sha
Write-Host "Latest commit: $sha" -ForegroundColor White

# Step 3: Trigger proper Vercel deployment with repoId
Write-Host ""
Write-Host "Triggering deployment..." -ForegroundColor Cyan
$body = @{
    name      = "curveyoyo"
    target    = "production"
    gitSource = @{
        type   = "github"
        repoId = $repo.id
        ref    = "main"
        sha    = $sha
    }
} | ConvertTo-Json -Depth 5

try {
    $result = Invoke-RestMethod -Uri 'https://api.vercel.com/v13/deployments' -Method POST -Headers $vercelHeaders -Body $body
    Write-Host "SUCCESS! Deploying..." -ForegroundColor Green
    Write-Host "  ID:    $($result.id)" -ForegroundColor White
    Write-Host "  URL:   https://$($result.url)" -ForegroundColor White
    Write-Host "  State: $($result.readyState)" -ForegroundColor White
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($err.error.message)" -ForegroundColor Red
    
    # Check if project is linked to GitHub correctly
    Write-Host ""
    Write-Host "Checking project git config..." -ForegroundColor Yellow
    $proj = Invoke-RestMethod -Uri 'https://api.vercel.com/v9/projects/curveyoyo' -Headers $vercelHeaders
    Write-Host "  Linked repo: $($proj.link.repo)" -ForegroundColor White
    Write-Host "  Type: $($proj.link.type)" -ForegroundColor White
}

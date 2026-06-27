param([string]$Token, [string]$ProjectId = "curveyoyo")

$envVars = @(
    @{ key="NEXT_PUBLIC_SUPABASE_URL";      value="https://ictpdvafpnvhuawmajwq.supabase.co" },
    @{ key="NEXT_PUBLIC_SUPABASE_ANON_KEY"; value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdHBkdmFmcG52aHVhd21handxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODAwNzQsImV4cCI6MjA5ODA1NjA3NH0.OzHD5GYW2nyxFZDY6Yb0fcASXD5Jvfx5NpvnSzCaXOs" },
    @{ key="SUPABASE_SERVICE_ROLE_KEY";     value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdHBkdmFmcG52aHVhd21handxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQ4MDA3NCwiZXhwIjoyMDk4MDU2MDc0fQ.m2z04jhU5DZ1AA-xeGpUO06ay0iq_VX22iGK1cBTny8" },
    @{ key="NEXT_PUBLIC_APP_URL";           value="https://www.yoyosmm.online" },
    @{ key="NEXTAUTH_SECRET";               value="7a5bfcf68e1c6b12a832d783d2673a5bc012e8bfa687dc9f12d8a436cb4e5a9c" },
    @{ key="DATABASE_URL";                  value="postgresql://postgres.ictpdvafpnvhuawmajwq:JaatRam%40%239211@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true" },
    @{ key="DIRECT_URL";                    value="postgresql://postgres.ictpdvafpnvhuawmajwq:JaatRam%40%239211@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" },
    @{ key="QSTASH_TOKEN";                  value="eyJVc2VySUQiOiI3YTM3MzY3Yi00YTI4LTRjMTEtODc3Zi04NzBiYzU2MjU3YjEiLCJQYXNzd29yZCI6IjNhNDhmNzE5ZmNjNTQyN2FiZWUxY2ZkYjA5ZWEyZjQ5In0=" },
    @{ key="QSTASH_CURRENT_SIGNING_KEY";    value="sig_64hMPUD8UQyiVzsDGezTYLqurAVg" },
    @{ key="QSTASH_NEXT_SIGNING_KEY";       value="sig_5F7wuXYpkeqd6GwMZuZ6KsqVEbMe" },
    @{ key="UPSTASH_REDIS_REST_URL";        value="https://humorous-termite-154500.upstash.io" },
    @{ key="UPSTASH_REDIS_REST_TOKEN";      value="gQAAAAAAAluEAAIgcDIzMWFjNmEyNjI1M2Q0NGYzOTY4MjM0MjYwYzc1MzczYg" },
    @{ key="RESEND_API_KEY";               value="re_GUbGBZ4K_Q7PKrF27NFtSCrec9HpYQD67" },
    @{ key="ADMIN_SECRET";                  value="yoyosmm_admin_sec_9e3a1f8b4d0c7e2d5a6c8e9b" }
)

$headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }
$targets = @("production","preview","development")

Write-Host "Setting $($envVars.Count) env vars on '$ProjectId'..." -ForegroundColor Cyan

foreach ($v in $envVars) {
    $body = (@{ key=$v.key; value=$v.value; type="plain"; target=$targets } | ConvertTo-Json -Compress)
    $url  = "https://api.vercel.com/v10/projects/$ProjectId/env"
    try {
        Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body | Out-Null
        Write-Host "  OK  $($v.key)" -ForegroundColor Green
    } catch {
        $msg = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($msg.error.code -eq "ENV_ALREADY_EXISTS") {
            $existing = (Invoke-RestMethod -Uri $url -Method GET -Headers $headers).envs | Where-Object { $_.key -eq $v.key } | Select-Object -First 1
            if ($existing) {
                Invoke-RestMethod -Uri "$url/$($existing.id)" -Method PATCH -Headers $headers -Body $body | Out-Null
                Write-Host "  UP  $($v.key)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ERR $($v.key): $($msg.error.message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "All done! Now triggering redeploy..." -ForegroundColor Cyan

$deployUrl = "https://api.vercel.com/v13/deployments"
$latest = (Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$ProjectId&limit=1" -Headers $headers).deployments[0]
Write-Host "Latest deployment: $($latest.uid)" -ForegroundColor White

$redeployBody = (@{ deploymentId=$latest.uid; name="curveyoyo"; target="production" } | ConvertTo-Json -Compress)
try {
    $redeploy = Invoke-RestMethod -Uri $deployUrl -Method POST -Headers $headers -Body $redeployBody
    Write-Host "Redeploy triggered! URL: $($redeploy.url)" -ForegroundColor Green
} catch {
    Write-Host "Redeploy failed - please redeploy manually at:" -ForegroundColor Yellow
    Write-Host "  https://vercel.com/sudeeppanghal/curveyoyo/deployments" -ForegroundColor White
}

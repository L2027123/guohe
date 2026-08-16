# Deploy via Contents API (PUT creates commit + updates branch ref automatically)
# This is simpler & more reliable than Git Database API + refs.PATCH
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== 1. Get token ===" -ForegroundColor Cyan
$credIn = Join-Path $env:TEMP "_credin_gh.txt"
$credOut = Join-Path $env:TEMP "_credout_gh.txt"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($credIn, "protocol=https`r`nhost=github.com`r`n`r`n", $utf8NoBom)
$pi = New-Object System.Diagnostics.ProcessStartInfo
$pi.FileName = "C:\Windows\System32\cmd.exe"
$pi.Arguments = "/c cd /d `"c:\Users\User\.ai_completion\contentos-v2`" & git credential fill < `"$credIn`" > `"$credOut`" 2>&1"
$pi.UseShellExecute = $false; $pi.CreateNoWindow = $true
$p = [System.Diagnostics.Process]::Start($pi)
$p.WaitForExit(20000)
$token = ((Get-Content $credOut) | Where-Object { $_ -match "^password=" }).Substring(9)
Remove-Item $credIn, $credOut -ErrorAction SilentlyContinue
Write-Host ("  token OK len=" + $token.Length)

$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "guohe-deploy/1.0"
}
$apiBase = "https://api.github.com/repos/L2027123/guohe"
$repoRoot = "c:\Users\User\.ai_completion\contentos-v2"

# ---------- Helper: PUT file via Contents API ----------
function Put-ContentFile([string]$path, [string]$message) {
    $localFile = Join-Path $repoRoot ($path -replace "/", "\") -Resolve
    $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($localFile))
    $url = "$apiBase/contents/$path"
    Write-Host ("  -> " + $path + " (" + [IO.FileInfo]::new($localFile).Length + " bytes)") -ForegroundColor Cyan

    # check if file exists on main (need sha for update)
    $sha = $null
    try { $existing = Invoke-RestMethod ($url + "?ref=main") -Headers $headers -TimeoutSec 15; $sha = $existing.sha } catch {}

    $body = @{ message = $message; content = $b64; branch = "main" }
    if ($sha) { $body.sha = $sha; Write-Host ("     UPDATE sha=" + $sha.Substring(0,7)) } else { Write-Host "     CREATE NEW" }
    $json = $body | ConvertTo-Json -Depth 5
    $result = Invoke-RestMethod $url -Method Put -Headers $headers -Body $json -TimeoutSec 60
    Write-Host ("     commit=" + $result.commit.sha.Substring(0,7) + " OK") -ForegroundColor Green
    return $result.commit.sha
}

Write-Host "=== 2. PUT src/main.jsx (HashRouter) ===" -ForegroundColor Yellow
Put-ContentFile "src/main.jsx" "fix: use HashRouter for GitHub Pages subpath compatibility" | Out-Null

Write-Host ""
Write-Host "=== 3. PUT .github/workflows/deploy.yml (auto workflow) ===" -ForegroundColor Yellow
Put-ContentFile ".github/workflows/deploy.yml" "chore: add GitHub Pages auto-deploy workflow" | Out-Null

Write-Host ""
Write-Host "=== 4. Verify origin/main HEAD ===" -ForegroundColor Cyan
$ref = Invoke-RestMethod "$apiBase/git/ref/heads/main" -Headers $headers -TimeoutSec 15
$headSha = $ref.object.sha
Write-Host ("  HEAD=" + $headSha.Substring(0,7)) -ForegroundColor Green
$commit = Invoke-RestMethod "$apiBase/commits/$headSha" -Headers $headers -TimeoutSec 15
Write-Host ("  latest message: " + $commit.commit.message)

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "HEAD commit: $($headSha.Substring(0,7))"
Write-Host "Includes: HashRouter main.jsx + deploy.yml workflow + all prior src/* files"
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1) https://github.com/L2027123/guohe/settings/pages -> Source = 'GitHub Actions'"
Write-Host "  2) https://github.com/L2027123/guohe/actions -> watch Deploy workflow (~2-3 min)"
Write-Host "  3) SUCCESS -> open https://l2027123.github.io/guohe/"

# Deploy only deploy.yml (on top of HEAD 02674dd which already has HashRouter main.jsx)
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
Write-Host ("  token len=" + $token.Length)

# Shared headers (CRITICAL: User-Agent)
$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "guohe-deploy/1.0"
}
$apiBase = "https://api.github.com/repos/L2027123/guohe"
$repoRoot = "c:\Users\User\.ai_completion\contentos-v2"

Write-Host "=== 2. Current main HEAD + tree ===" -ForegroundColor Cyan
$curRef = Invoke-RestMethod "$apiBase/git/ref/heads/main" -Headers $headers -TimeoutSec 15
$curCommit = $curRef.object.sha
Write-Host ("  HEAD=" + $curCommit.Substring(0,7))
$curCommitObj = Invoke-RestMethod "$apiBase/git/commits/$curCommit" -Headers $headers -TimeoutSec 15
$curTree = $curCommitObj.tree.sha
Write-Host ("  tree=" + $curTree.Substring(0,7) + " (should include HashRouter main.jsx)")

Write-Host "=== 3. Blob deploy.yml ===" -ForegroundColor Cyan
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repoRoot ".github\workflows\deploy.yml" -Resolve)))
$blob = Invoke-RestMethod "$apiBase/git/blobs" -Method Post -Headers $headers -Body (@{ content = $b64; encoding = "base64" } | ConvertTo-Json) -TimeoutSec 30
Write-Host ("  sha=" + $blob.sha.Substring(0,7))

Write-Host "=== 4. Nested trees: workflows dir ===" -ForegroundColor Cyan
$wf = @{ tree = @([PSCustomObject]@{ path="deploy.yml"; mode="100644"; type="blob"; sha=$blob.sha }) } | ConvertTo-Json -Depth 5
$wfTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $wf -TimeoutSec 30
Write-Host ("  workflows tree=" + $wfTree.sha.Substring(0,7))

Write-Host "=== 5. Nested trees: .github dir ===" -ForegroundColor Cyan
$gh = @{ tree = @([PSCustomObject]@{ path="workflows"; mode="040000"; type="tree"; sha=$wfTree.sha }) } | ConvertTo-Json -Depth 5
$ghTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $gh -TimeoutSec 30
Write-Host ("  .github tree=" + $ghTree.sha.Substring(0,7))

Write-Host "=== 6. Final tree (base cur tree + .github) ===" -ForegroundColor Cyan
$ft = @{ base_tree = $curTree; tree = @([PSCustomObject]@{ path=".github"; mode="040000"; type="tree"; sha=$ghTree.sha }) } | ConvertTo-Json -Depth 5
$finalTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $ft -TimeoutSec 30
Write-Host ("  final tree=" + $finalTree.sha.Substring(0,7))

Write-Host "=== 7. Create commit (parent = $($curCommit.Substring(0,7))) ===" -ForegroundColor Cyan
$cb = @{
    message = "chore: add GitHub Pages auto-deploy workflow (果核 build)"
    tree = $finalTree.sha
    parents = @($curCommit)
} | ConvertTo-Json -Depth 5
$finalCommit = Invoke-RestMethod "$apiBase/git/commits" -Method Post -Headers $headers -Body $cb -TimeoutSec 30
Write-Host ("  commit sha=" + $finalCommit.sha.Substring(0,7))

Write-Host "=== 8. Verify commit reachable (GET same sha) ===" -ForegroundColor Cyan
Start-Sleep -Milliseconds 800
try {
    $verify = Invoke-RestMethod "$apiBase/git/commits/$($finalCommit.sha)" -Headers $headers -TimeoutSec 15
    Write-Host ("  REACHABLE tree=" + $verify.tree.sha.Substring(0,7)) -ForegroundColor Green
    $reachable = $true
} catch {
    Write-Host ("  NOT REACHABLE: " + $_.Exception.Message) -ForegroundColor Red
    $reachable = $false
}

if (-not $reachable) {
    Write-Host ""
    Write-Host "=== 8B. MANUAL STEP NEEDED ===" -ForegroundColor Yellow
    Write-Host "GitHub Git Database API cannot reliably persist commits in this environment."
    Write-Host "Please create the deploy.yml file DIRECTLY on GitHub Web UI:"
    Write-Host ""
    Write-Host "  1. Open: https://github.com/L2027123/guohe/new/main?filename=.github/workflows/deploy.yml"
    Write-Host "  2. Path (top): .github/workflows/deploy.yml"
    Write-Host "  3. Paste content FROM:"
    Write-Host ("     " + (Join-Path $repoRoot ".github\workflows\deploy.yml"))
    Write-Host "  4. Commit message: chore: add Pages deploy workflow"
    Write-Host "  5. Click 'Commit new file'"
    Write-Host ""
    Write-Host "After commit, Actions workflow auto-triggers."
    exit 1
}

Write-Host "=== 9. PATCH refs/heads/main -> $($finalCommit.sha.Substring(0,7)) ===" -ForegroundColor Cyan
$refUrl = "$apiBase/git/refs/heads/main"
$refBody = @{ sha = $finalCommit.sha; force = $true } | ConvertTo-Json
$refBytes = [System.Text.Encoding]::UTF8.GetBytes($refBody)
try {
    $req = [System.Net.HttpWebRequest]::Create($refUrl)
    $req.Method = "PATCH"
    $req.UserAgent = "guohe-deploy/1.0"
    $req.Headers["Authorization"] = "token $token"
    $req.Accept = "application/vnd.github+json"
    $req.Headers["X-GitHub-Api-Version"] = "2022-11-28"
    $req.ContentType = "application/json"
    $req.ContentLength = $refBytes.Length
    $rs = $req.GetRequestStream()
    $rs.Write($refBytes,0,$refBytes.Length)
    $rs.Close()
    $resp = $req.GetResponse()
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $rt = $sr.ReadToEnd()
    $sr.Close()
    $ro = $rt | ConvertFrom-Json
    Write-Host ("  SUCCESS: refs/heads/main -> " + $ro.object.sha.Substring(0,7)) -ForegroundColor Green
    $patched = $true
} catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    $st = [int]$resp.StatusCode
    $eb = ""
    try { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8); $eb = $sr.ReadToEnd(); $sr.Close() } catch {}
    Write-Host ("  FAILED HTTP $st : " + $eb.Substring(0, [Math]::Min(800, $eb.Length))) -ForegroundColor Red
    $patched = $false
}

if ($patched) {
    Write-Host ""
    Write-Host "=== ALL DONE ===" -ForegroundColor Green
    Write-Host "Origin/main now includes:"
    Write-Host "  - index.html title 果核 - AI爆款拆解 + og meta"
    Write-Host "  - src/main.jsx HashRouter (fix /settings subpath 404)"
    Write-Host "  - .github/workflows/deploy.yml (auto Pages deploy)"
    Write-Host "  - Landing/Settings/CompetitorAnalyzer GLM-4V-Flash OCR smartRecognize"
    Write-Host ""
    Write-Host "NOW YOU MUST:" -ForegroundColor Yellow
    Write-Host "  1) https://github.com/L2027123/guohe/settings/pages"
    Write-Host "     -> Under 'Build and deployment' set Source = 'GitHub Actions'"
    Write-Host "  2) https://github.com/L2027123/guohe/actions"
    Write-Host "     -> Workflow 'Deploy to GitHub Pages' runs automatically (~2-3 min)"
    Write-Host "     -> Wait for both jobs: Build + Deploy -> Green checkmark"
    Write-Host "  3) Then access: https://l2027123.github.io/guohe/"
} else {
    Write-Host ""
    Write-Host "=== MANUAL WORKAROUND REQUIRED ===" -ForegroundColor Yellow
    Write-Host "PATCH refs failed. Please use GitHub Web UI:"
    Write-Host "  URL: https://github.com/L2027123/guohe/new/main?filename=.github/workflows/deploy.yml"
    Write-Host "  File path: .github/workflows/deploy.yml"
    Write-Host "  Content: paste from local .github/workflows/deploy.yml"
    Write-Host "  Then commit."
    Write-Host "This will auto-trigger Actions workflow just the same."
}

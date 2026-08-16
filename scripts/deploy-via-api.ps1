# Final deploy: main.jsx HashRouter + deploy.yml workflow (with User-Agent)
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

# CRITICAL: GitHub REST API requires User-Agent header or returns 403/404
$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Content-Type" = "application/json"
    "User-Agent" = "guohe-deploy/1.0"
}
$apiBase = "https://api.github.com/repos/L2027123/guohe"
$repoRoot = "c:\Users\User\.ai_completion\contentos-v2"

Write-Host "=== 2. Current main ===" -ForegroundColor Cyan
$curRef = Invoke-RestMethod "$apiBase/git/ref/heads/main" -Headers $headers -TimeoutSec 15
$curCommit = $curRef.object.sha
Write-Host ("  HEAD commit: " + $curCommit.Substring(0,7))
$curCommitObj = Invoke-RestMethod "$apiBase/git/commits/$curCommit" -Headers $headers -TimeoutSec 15
$curTree = $curCommitObj.tree.sha
Write-Host ("  base tree:  " + $curTree.Substring(0,7))

Write-Host "=== 3A. Blob src/main.jsx (HashRouter) ===" -ForegroundColor Cyan
$b64Main = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repoRoot "src\main.jsx" -Resolve)))
$blobMain = Invoke-RestMethod "$apiBase/git/blobs" -Method Post -Headers $headers -Body (@{ content = $b64Main; encoding = "base64" } | ConvertTo-Json) -TimeoutSec 30
Write-Host ("  sha=" + $blobMain.sha.Substring(0,7))

Write-Host "=== 3B. Blob .github/workflows/deploy.yml ===" -ForegroundColor Cyan
$b64Deploy = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repoRoot ".github\workflows\deploy.yml" -Resolve)))
$blobDeploy = Invoke-RestMethod "$apiBase/git/blobs" -Method Post -Headers $headers -Body (@{ content = $b64Deploy; encoding = "base64" } | ConvertTo-Json) -TimeoutSec 30
Write-Host ("  sha=" + $blobDeploy.sha.Substring(0,7))

Write-Host "=== 4. Tree 1: only main.jsx (base=$($curTree.Substring(0,7))) ===" -ForegroundColor Cyan
$treeItems1 = @([PSCustomObject]@{ path = "src/main.jsx"; mode = "100644"; type = "blob"; sha = $blobMain.sha })
$tree1 = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body (@{ base_tree = $curTree; tree = $treeItems1 } | ConvertTo-Json -Depth 5) -TimeoutSec 30
Write-Host ("  tree1 sha=" + $tree1.sha.Substring(0,7))

Write-Host "=== 5. Commit 1: main.jsx HashRouter ===" -ForegroundColor Cyan
$commit1Body = @{
    message = "fix: use HashRouter for GitHub Pages subpath compatibility"
    tree = $tree1.sha
    parents = @($curCommit)
} | ConvertTo-Json -Depth 5
$commit1 = Invoke-RestMethod "$apiBase/git/commits" -Method Post -Headers $headers -Body $commit1Body -TimeoutSec 30
Write-Host ("  commit1 sha=" + $commit1.sha.Substring(0,7))

Write-Host "=== 6. Nested dir trees for deploy.yml ===" -ForegroundColor Yellow
$wfTreeBody = @{ tree = @([PSCustomObject]@{ path = "deploy.yml"; mode = "100644"; type = "blob"; sha = $blobDeploy.sha }) } | ConvertTo-Json -Depth 5
$wfTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $wfTreeBody -TimeoutSec 30
Write-Host ("  workflows dir tree=" + $wfTree.sha.Substring(0,7))

$ghTreeBody = @{ tree = @([PSCustomObject]@{ path = "workflows"; mode = "040000"; type = "tree"; sha = $wfTree.sha }) } | ConvertTo-Json -Depth 5
$ghTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $ghTreeBody -TimeoutSec 30
Write-Host ("  .github dir tree=" + $ghTree.sha.Substring(0,7))

Write-Host "=== 7. Tree final: tree1 + .github entry ===" -ForegroundColor Cyan
$finalTreeItems = @([PSCustomObject]@{ path = ".github"; mode = "040000"; type = "tree"; sha = $ghTree.sha })
$finalTreeBody = @{ base_tree = $commit1.tree.sha; tree = $finalTreeItems } | ConvertTo-Json -Depth 5
$finalTree = Invoke-RestMethod "$apiBase/git/trees" -Method Post -Headers $headers -Body $finalTreeBody -TimeoutSec 30
Write-Host ("  final tree=" + $finalTree.sha.Substring(0,7))

Write-Host "=== 8. Final commit (HashRouter + workflow) ===" -ForegroundColor Cyan
$finalCommitBody = @{
    message = "chore: HashRouter + GitHub Pages auto-deploy workflow (API deploy 2026-08-17)"
    tree = $finalTree.sha
    parents = @($commit1.sha)
} | ConvertTo-Json -Depth 5
$finalCommit = Invoke-RestMethod "$apiBase/git/commits" -Method Post -Headers $headers -Body $finalCommitBody -TimeoutSec 30
Write-Host ("  final commit=" + $finalCommit.sha.Substring(0,7))

Write-Host "=== 9. PATCH refs/heads/main -> final commit (force) ===" -ForegroundColor Cyan
$refBody = @{ sha = $finalCommit.sha; force = $true } | ConvertTo-Json
$updateRef = Invoke-RestMethod "$apiBase/git/refs/heads/main" -Method Patch -Headers $headers -Body $refBody -TimeoutSec 30
Write-Host ("  main=" + $updateRef.ref + " -> " + $updateRef.object.sha.Substring(0,7)) -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host ("Origin/main: " + $finalCommit.sha.Substring(0,7) + " (HashRouter + deploy.yml workflow + 8 src/* files)")
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. GitHub > Settings > Pages > Source = 'GitHub Actions' (not 'Deploy from branch')"
Write-Host "  2. GitHub > Actions tab: watch workflow 'Deploy to GitHub Pages' run (~2-3 min)"
Write-Host "  3. After workflow SUCCESS, visit https://l2027123.github.io/guohe/"

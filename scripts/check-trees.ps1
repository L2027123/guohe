$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$credInput = "protocol=https`nhost=github.com`n`n"
$credOut = $credInput | git credential fill 2>&1
$token = ($credOut | Select-String "^password=").Line.Substring(9)
$headers = @{ Authorization = "token $token"; Accept = "application/vnd.github+json" }

Write-Host "=== check tree 0c180cdb (ce295d49 tree) ==="
try {
    $t = Invoke-RestMethod "https://api.github.com/repos/L2027123/guohe/git/trees/0c180cdbd76480b1b4fc6446b9e5b4f7176a2248" -Headers $headers -TimeoutSec 15
    Write-Host ("OK treeEntries=" + $t.tree.Count)
} catch { Write-Host ("ERR: " + $_.Exception.Message) }

Write-Host "=== check tree 28203ad (b7a5d21 tree) ==="
try {
    $t = Invoke-RestMethod "https://api.github.com/repos/L2027123/guohe/git/trees/28203ad981b490506cfabae4761db7fae9dce95c" -Headers $headers -TimeoutSec 15
    Write-Host ("OK treeEntries=" + $t.tree.Count)
} catch { Write-Host ("ERR: " + $_.Exception.Message) }

Write-Host "=== check commit ce295d49 ==="
try {
    $c = Invoke-RestMethod "https://api.github.com/repos/L2027123/guohe/git/commits/ce295d49f990d667d713d900da4784b929dbed6f" -Headers $headers -TimeoutSec 15
    Write-Host ("OK commit tree=" + $c.tree.sha)
} catch { Write-Host ("ERR: " + $_.Exception.Message) }

Write-Host "=== list main branch contents (root) ==="
try {
    $r = Invoke-RestMethod "https://api.github.com/repos/L2027123/guohe/contents/?ref=main" -Headers $headers -TimeoutSec 15
    $r | ForEach-Object { Write-Host ("  " + $_.type + " " + $_.path) }
} catch { Write-Host ("ERR: " + $_.Exception.Message) }

Write-Host "=== check .github/workflows exists ==="
try {
    $r = Invoke-RestMethod "https://api.github.com/repos/L2027123/guohe/contents/.github/workflows?ref=main" -Headers $headers -TimeoutSec 15
    $r | ForEach-Object { Write-Host ("  " + $_.name) }
} catch { Write-Host ("ERR: " + $_.Exception.Message) }

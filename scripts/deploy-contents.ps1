# Upload files via GitHub Contents API (more reliable than Git Database API for small sets)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== 1. Get token ===" -ForegroundColor Cyan
$credInput = "protocol=https`nhost=github.com`n`n"
$credOut = $credInput | git credential fill 2>&1
$token = ($credOut | Select-String "^password=").Line.Substring(9)
if (-not $token -or $token.Length -lt 10) { Write-Host "ERROR: no token" -ForegroundColor Red; exit 1 }
Write-Host "token OK (masked)"

$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$repo = "L2027123/guohe"
$apiBase = "https://api.github.com/repos/$repo"
$repoRoot = "c:\Users\User\.ai_completion\contentos-v2"

function Upload-File($path, $message) {
    $fullPath = Join-Path $repoRoot $path -Resolve
    $bytes = [IO.File]::ReadAllBytes($fullPath)
    $b64 = [Convert]::ToBase64String($bytes)
    $url = "$apiBase/contents/$path"

    # check if file exists (need sha for update)
    $sha = $null
    try {
        $existing = Invoke-RestMethod $url -Headers $headers -TimeoutSec 15
        $sha = $existing.sha
        Write-Host "  $path exists (sha=$($sha.Substring(0,7))), will update"
    } catch {
        Write-Host "  $path new, will create"
    }

    $body = @{
        message = $message
        content = $b64
        branch = "main"
    }
    if ($sha) { $body.sha = $sha }
    $bodyJson = $body | ConvertTo-Json -Depth 3

    $resp = Invoke-RestMethod $url -Method Put -Headers $headers -Body $bodyJson -TimeoutSec 30
    Write-Host "  $path uploaded, commit=$($resp.commit.sha.Substring(0,7))" -ForegroundColor Green
}

Write-Host "=== 2. Upload deploy.yml (new file, triggers workflow) ===" -ForegroundColor Cyan
Upload-File ".github/workflows/deploy.yml" "chore: add GitHub Pages deploy workflow"

Write-Host "=== 3. Upload main.jsx (HashRouter) ===" -ForegroundColor Cyan
Upload-File "src/main.jsx" "fix: use HashRouter for GitHub Pages subpath"

Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Both files uploaded. Workflow should trigger and build with HashRouter."

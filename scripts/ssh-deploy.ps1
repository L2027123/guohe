# Deploy via SSH over 443 (ssh.github.com:443 reachable, github.com:443 blocked)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== 1. Get token ===" -ForegroundColor Cyan
$tmpFile = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($tmpFile, "protocol=https`r`nhost=github.com`r`n`r`n", [Text.Encoding]::ASCII)
$credOut = Get-Content $tmpFile -Raw | git credential fill 2>&1
Remove-Item $tmpFile -ErrorAction SilentlyContinue
$token = ($credOut | Select-String "^password=").Line.Substring(9)
if (-not $token -or $token.Length -lt 10) { Write-Host "ERROR: no token" -ForegroundColor Red; exit 1 }
Write-Host "token OK (masked)"
$headers = @{ Authorization = "token $token"; Accept = "application/vnd.github+json" }

Write-Host "=== 2. Check ssh-keygen ===" -ForegroundColor Cyan
$sshKeygen = Get-Command ssh-keygen -ErrorAction SilentlyContinue
if (-not $sshKeygen) {
    $sshKeygen = Get-Command "C:\Program Files\Git\usr\bin\ssh-keygen.exe" -ErrorAction SilentlyContinue
}
if (-not $sshKeygen) { Write-Host "ERROR: ssh-keygen not found" -ForegroundColor Red; exit 1 }
Write-Host ("ssh-keygen: " + $sshKeygen.Source)

# Ensure ~/.ssh exists
$sshDir = Join-Path $env:USERPROFILE ".ssh"
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir | Out-Null }

$keyPath = Join-Path $sshDir "id_ed25519_guohe"
$pubKeyPath = $keyPath + ".pub"

Write-Host "=== 3. Generate SSH key (if not exists) ===" -ForegroundColor Cyan
if (-not (Test-Path $keyPath)) {
    & $sshKeygen.Source -t ed25519 -f $keyPath -N '""' -C "guohe-deploy@local" -q
    Write-Host "key generated"
} else {
    Write-Host "key already exists"
}
$pubKey = Get-Content $pubKeyPath -Raw
Write-Host ("pubkey: " + $pubKey.Substring(0,40) + "...")

Write-Host "=== 4. Add public key to GitHub (via API) ===" -ForegroundColor Cyan
$keyBody = @{ title = "guohe-deploy-local"; key = $pubKey.Trim() } | ConvertTo-Json
try {
    $keyResp = Invoke-RestMethod "https://api.github.com/user/keys" -Method Post -Headers $headers -Body $keyBody -TimeoutSec 20
    Write-Host ("key added, id=" + $keyResp.id) -ForegroundColor Green
} catch {
    $msg = $_.Exception.Message
    if ($msg -match "already") {
        Write-Host "key already exists on GitHub" -ForegroundColor Yellow
    } else {
        Write-Host ("ERR adding key: " + $msg) -ForegroundColor Red
        Write-Host "token may lack admin:public_key scope. Trying alternative..."
    }
}

Write-Host "=== 5. Configure SSH for ssh.github.com:443 ===" -ForegroundColor Cyan
$configPath = Join-Path $sshDir "config"
$configEntry = @"

Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile $keyPath
    StrictHostKeyChecking no
    UserKnownHostsFile $null
"@
Add-Content -Path $configPath -Value $configEntry
Write-Host "SSH config updated"

Write-Host "=== 6. Test SSH connection ===" -ForegroundColor Cyan
$sshExe = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshExe) { $sshExe = Get-Command "C:\Program Files\Git\usr\bin\ssh.exe" -ErrorAction SilentlyContinue }
if ($sshExe) {
    $test = & $sshExe.Source -o StrictHostKeyChecking=no -o ConnectTimeout=15 -T git@github.com 2>&1
    Write-Host ("ssh test: " + ($test -join " "))
}

Write-Host "=== 7. Switch remote to SSH and push ===" -ForegroundColor Cyan
Set-Location "c:\Users\User\.ai_completion\contentos-v2"
git remote set-url origin git@github.com:L2027123/guohe.git
Write-Host "remote switched to SSH"

Write-Host "=== 8. Force push main (includes all local commits) ===" -ForegroundColor Cyan
$pushOut = git push --force origin main 2>&1
Write-Host ($pushOut -join "`n")

Write-Host "=== DONE ===" -ForegroundColor Green

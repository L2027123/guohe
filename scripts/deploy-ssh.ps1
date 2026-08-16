# Deploy via SSH over 443 (ssh.github.com:443 is open)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== 1. Get GitHub token via Process (no PS pipeline) ===" -ForegroundColor Cyan
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$proc.StartInfo.FileName = "git"
$proc.StartInfo.Arguments = "credential fill"
$proc.StartInfo.RedirectStandardInput = $true
$proc.StartInfo.RedirectStandardOutput = $true
$proc.StartInfo.RedirectStandardError = $true
$proc.StartInfo.UseShellExecute = $false
$proc.StartInfo.CreateNoWindow = $true
$proc.Start() | Out-Null
$sw = $proc.StandardInput
$sw.NewLine = "`n"
$sw.WriteLine("protocol=https")
$sw.WriteLine("host=github.com")
$sw.WriteLine()
$sw.Close()
$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit(15000)
Write-Host ("credential exit=" + $proc.ExitCode + ", stderr=" + $stderr.Trim())
$tokenLine = ($stdout -split "`n" | Where-Object { $_ -match "^password=" })
if (-not $tokenLine) { Write-Host "ERROR: no token. stdout:"; Write-Host $stdout; exit 1 }
$token = $tokenLine.Substring(9)
Write-Host "token OK (masked)"
$headers = @{ Authorization = "token $token"; Accept = "application/vnd.github+json" }

$sshDir = Join-Path $env:USERPROFILE ".ssh"
$keyPath = Join-Path $sshDir "id_ed25519_guohe"
$pubKeyPath = $keyPath + ".pub"
$sshKeygenExe = "C:\Program Files\Git\usr\bin\ssh-keygen.exe"
$sshExe = "C:\Program Files\Git\usr\bin\ssh.exe"
if (-not (Test-Path $sshKeygenExe)) {
    $sshKeygenExe = (Get-Command ssh-keygen -ErrorAction SilentlyContinue).Source
    $sshExe = (Get-Command ssh -ErrorAction SilentlyContinue).Source
}
Write-Host ("ssh-keygen: " + $sshKeygenExe)

Write-Host "=== 2. Ensure .ssh dir exists ===" -ForegroundColor Cyan
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir -Force | Out-Null }

Write-Host "=== 3. Generate ed25519 key (if not exists) ===" -ForegroundColor Cyan
if (-not (Test-Path $keyPath)) {
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $p.StartInfo.FileName = $sshKeygenExe
    $p.StartInfo.Arguments = "-t ed25519 -f `"$keyPath`" -N `"`" -C `"guohe-deploy-local`" -q"
    $p.StartInfo.UseShellExecute = $false
    $p.StartInfo.CreateNoWindow = $true
    $p.Start() | Out-Null
    $p.WaitForExit(30000)
    Write-Host ("ssh-keygen exit=" + $p.ExitCode)
} else { Write-Host "key already exists" }
$pubKey = (Get-Content $pubKeyPath -Raw).Trim()
Write-Host ("pubkey: " + $pubKey.Substring(0,40) + "...")

Write-Host "=== 4. Add pubkey to GitHub via API ===" -ForegroundColor Cyan
$keyBody = @{ title = "guohe-deploy-local-" + [DateTime]::Now.ToString("yyyyMMddHHmm"); key = $pubKey } | ConvertTo-Json
try {
    $keyResp = Invoke-RestMethod "https://api.github.com/user/keys" -Method Post -Headers $headers -Body $keyBody -TimeoutSec 20
    Write-Host ("key added, id=" + $keyResp.id) -ForegroundColor Green
} catch {
    $msg = $_.Exception.Message
    Write-Host ("add key result: " + $msg) -ForegroundColor Yellow
}

Write-Host "=== 5. Write SSH config ===" -ForegroundColor Cyan
$configPath = Join-Path $sshDir "config"
$configBlock = @"

Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile $keyPath
    IdentitiesOnly yes
    StrictHostKeyChecking no
    UserKnownHostsFile NUL

"@
Add-Content -Path $configPath -Value $configBlock -Encoding UTF8
Write-Host "SSH config updated"

Write-Host "=== 6. Test SSH connection ===" -ForegroundColor Cyan
Set-Location "c:\Users\User\.ai_completion\contentos-v2"
Start-Sleep -Seconds 2
$p = New-Object System.Diagnostics.Process
$p.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$p.StartInfo.FileName = $sshExe
$p.StartInfo.Arguments = "-o StrictHostKeyChecking=no -o ConnectTimeout=20 -o IdentitiesOnly=yes -i `"$keyPath`" -p 443 git@ssh.github.com -T"
$p.StartInfo.RedirectStandardOutput = $true
$p.StartInfo.RedirectStandardError = $true
$p.StartInfo.UseShellExecute = $false
$p.StartInfo.CreateNoWindow = $true
$p.Start() | Out-Null
$sshOut = $p.StandardError.ReadToEnd() + $p.StandardOutput.ReadToEnd()
$p.WaitForExit(25000)
Write-Host ("ssh exit=" + $p.ExitCode + " output: " + $sshOut.Trim())

Write-Host "=== 7. Switch remote to SSH URL ===" -ForegroundColor Cyan
Set-Location "c:\Users\User\.ai_completion\contentos-v2"
git remote set-url origin "git@github.com:L2027123/guohe.git"
Write-Host ("remote: " + (git remote get-url origin))

Write-Host "=== 8. Force push main ===" -ForegroundColor Cyan
$pushProc = New-Object System.Diagnostics.Process
$pushProc.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$pushProc.StartInfo.FileName = "git"
$pushProc.StartInfo.Arguments = "push --force origin main"
$pushProc.StartInfo.RedirectStandardOutput = $true
$pushProc.StartInfo.RedirectStandardError = $true
$pushProc.StartInfo.UseShellExecute = $false
$pushProc.StartInfo.CreateNoWindow = $true
$pushProc.StartInfo.WorkingDirectory = "c:\Users\User\.ai_completion\contentos-v2"
$pushProc.Start() | Out-Null
$pushOut = $pushProc.StandardError.ReadToEnd() + $pushProc.StandardOutput.ReadToEnd()
$pushProc.WaitForExit(120000)
Write-Host ("git push exit=" + $pushProc.ExitCode)
Write-Host $pushOut.Trim()

Write-Host "=== 9. Verify ===" -ForegroundColor Cyan
git fetch origin 2>&1 | Out-Null
$statusOut = git status -sb
Write-Host $statusOut
$ahead = git rev-list --count origin/main..HEAD 2>$null
Write-Host ("ahead count: " + $ahead)

Write-Host "=== DONE ===" -ForegroundColor Green
if ([string]$ahead -eq "0") {
    Write-Host "PUSH OK. Origin/main = b126dd8 with deploy.yml + HashRouter + GLM-4V-Flash" -ForegroundColor Green
    Write-Host "GitHub Actions 'Deploy to GitHub Pages' workflow will trigger now (~2-3 min)."
    Write-Host "YOU MUST CHECK: GitHub repo > Settings > Pages > Source, select 'GitHub Actions'" -ForegroundColor Yellow
} else {
    Write-Host "PUSH FAILED. ahead=$ahead" -ForegroundColor Red
}

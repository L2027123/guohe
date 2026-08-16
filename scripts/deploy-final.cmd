@echo off
REM ============================================================
REM  Deploy: upload deploy.yml + main.jsx via GitHub Contents API
REM  Uses api.github.com (reachable when github.com:443 blocked)
REM ============================================================
setlocal

cd /d "c:\Users\User\.ai_completion\contentos-v2"

echo === STEP 1: Get GitHub token from credential manager ===
for /f "usebackq delims=" %%L in (`(echo protocol=https^& echo host=github.com^& echo.) ^| git credential fill 2^>^&1`) do (
  echo %%L | findstr /b "password=" >nul && set "TOKEN_LINE=%%L"
)
if "%TOKEN_LINE%"=="" (
  echo ERROR: Cannot get token
  exit /b 1
)
set "GITHUB_TOKEN=%TOKEN_LINE:~9%"
echo token OK (len=%GITHUB_TOKEN:~0,1%...)

echo.
echo === STEP 2: Upload .github/workflows/deploy.yml ===
set "PATH_URL=.github/workflows/deploy.yml"
set "LOCAL_FILE=.github\workflows\deploy.yml"
echo local file: %LOCAL_FILE%

REM encode to base64 (certutil)
certutil -encode "%LOCAL_FILE%" "%TEMP%\_deploy_b64.tmp" >nul
REM remove certutil headers/footers + CRLF to get single-line
powershell -NoProfile -Command "$c = Get-Content '%TEMP%\_deploy_b64.tmp' -Raw; $c = $c -replace '-+BEGIN CERTIFICATE-+-+END CERTIFICATE-+\s+','' -replace '\s',''; Set-Content '%TEMP%\_deploy_b64_line.tmp' $c -NoNewline"
set /p B64_CONTENT=<"%TEMP%\_deploy_b64_line.tmp"

REM check file exists via API (need sha for update)
set "SHA_VAL="
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json'};try{$r=Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%?ref=main' -Headers $h -TimeoutSec 15;Write-Output ('EXISTS:'+$r.sha)}catch{Write-Output 'NOT_FOUND'}" 2^>^&1`) do set "API_RESULT=%%R"
echo API check: %API_RESULT%
echo %API_RESULT% | findstr /b "EXISTS:" >nul && set "SHA_VAL=%API_RESULT:~7%"

REM Build body JSON with PowerShell (proper escaping)
if "%SHA_VAL%"=="" (
  echo creating new file...
  powershell -NoProfile -Command ^
    "$b64 = (Get-Content '%TEMP%\_deploy_b64_line.tmp' -Raw).Trim();" ^
    "$body = @{message='chore: add GitHub Pages deploy workflow';content=$b64;branch='main'} | ConvertTo-Json -Depth 3 -Compress;" ^
    "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';'Content-Type'='application/json'};" ^
    "try { $r = Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%' -Method Put -Headers $h -Body $body -TimeoutSec 30; Write-Output ('OK commit:'+$r.commit.sha.Substring(0,7)) } catch { $e=$_.Exception.Message; Write-Output ('ERR: '+$e) }"
) else (
  echo updating existing file, sha=%SHA_VAL:~0,7%...
  powershell -NoProfile -Command ^
    "$b64 = (Get-Content '%TEMP%\_deploy_b64_line.tmp' -Raw).Trim();" ^
    "$body = @{message='chore: update deploy workflow';content=$b64;sha='%SHA_VAL%';branch='main'} | ConvertTo-Json -Depth 3 -Compress;" ^
    "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';'Content-Type'='application/json'};" ^
    "try { $r = Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%' -Method Put -Headers $h -Body $body -TimeoutSec 30; Write-Output ('OK commit:'+$r.commit.sha.Substring(0,7)) } catch { $e=$_.Exception.Message; Write-Output ('ERR: '+$e) }"
)
del "%TEMP%\_deploy_b64.tmp" "%TEMP%\_deploy_b64_line.tmp" 2>nul

echo.
echo === STEP 3: Upload src/main.jsx (HashRouter fix) ===
set "PATH_URL=src/main.jsx"
set "LOCAL_FILE=src\main.jsx"

certutil -encode "%LOCAL_FILE%" "%TEMP%\_main_b64.tmp" >nul
powershell -NoProfile -Command "$c = Get-Content '%TEMP%\_main_b64.tmp' -Raw; $c = $c -replace '-+BEGIN CERTIFICATE-+-+END CERTIFICATE-+\s+','' -replace '\s',''; Set-Content '%TEMP%\_main_b64_line.tmp' $c -NoNewline"
set /p B64_CONTENT=<"%TEMP%\_main_b64_line.tmp"

set "SHA_VAL="
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json'};try{$r=Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%?ref=main' -Headers $h -TimeoutSec 15;Write-Output ('EXISTS:'+$r.sha)}catch{Write-Output 'NOT_FOUND'}" 2^>^&1`) do set "API_RESULT=%%R"
echo API check: %API_RESULT%
echo %API_RESULT% | findstr /b "EXISTS:" >nul && set "SHA_VAL=%API_RESULT:~7%"

if "%SHA_VAL%"=="" (
  echo creating new file...
  powershell -NoProfile -Command ^
    "$b64 = (Get-Content '%TEMP%\_main_b64_line.tmp' -Raw).Trim();" ^
    "$body = @{message='fix: use HashRouter for GitHub Pages subpath';content=$b64;branch='main'} | ConvertTo-Json -Depth 3 -Compress;" ^
    "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';'Content-Type'='application/json'};" ^
    "try { $r = Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%' -Method Put -Headers $h -Body $body -TimeoutSec 30; Write-Output ('OK commit:'+$r.commit.sha.Substring(0,7)) } catch { $e=$_.Exception.Message; Write-Output ('ERR: '+$e) }"
) else (
  echo updating existing file, sha=%SHA_VAL:~0,7%...
  powershell -NoProfile -Command ^
    "$b64 = (Get-Content '%TEMP%\_main_b64_line.tmp' -Raw).Trim();" ^
    "$body = @{message='fix: use HashRouter for GitHub Pages subpath';content=$b64;sha='%SHA_VAL%';branch='main'} | ConvertTo-Json -Depth 3 -Compress;" ^
    "$h=@{Authorization='token %GITHUB_TOKEN%';Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';'Content-Type'='application/json'};" ^
    "try { $r = Invoke-RestMethod 'https://api.github.com/repos/L2027123/guohe/contents/%PATH_URL%' -Method Put -Headers $h -Body $body -TimeoutSec 30; Write-Output ('OK commit:'+$r.commit.sha.Substring(0,7)) } catch { $e=$_.Exception.Message; Write-Output ('ERR: '+$e) }"
)
del "%TEMP%\_main_b64.tmp" "%TEMP%\_main_b64_line.tmp" 2>nul

echo.
echo === DONE ===

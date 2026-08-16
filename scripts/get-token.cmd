@echo off
REM Read GitHub token via git credential using cmd.exe native echo pipe
setlocal
set OUTFILE=%TEMP%\_git_token_%RANDOM%.txt
(
echo protocol=https
echo host=github.com
echo.
) | git credential fill > "%OUTFILE%" 2>&1
type "%OUTFILE%"
endlocal

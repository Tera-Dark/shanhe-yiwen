@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "WEB_DIR=%ROOT%web"
set "PORT=4182"
set "URL=http://127.0.0.1:%PORT%/"
set "NO_OPEN="
if /i "%~1"=="--no-open" set "NO_OPEN=1"

where node >nul 2>nul
if errorlevel 1 goto :fallback

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing '%URL%__health' -TimeoutSec 1; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :open

start "ShanHe World Atlas Server" /min node "%WEB_DIR%\server.mjs" %PORT%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; 1..25 | ForEach-Object { if(-not $ok){ try { $r=Invoke-WebRequest -UseBasicParsing '%URL%__health' -TimeoutSec 1; if($r.StatusCode -eq 200){$ok=$true} } catch {}; if(-not $ok){Start-Sleep -Milliseconds 160} } }; if($ok){exit 0}else{exit 1}" >nul 2>nul
if errorlevel 1 goto :fallback

:open
if defined NO_OPEN exit /b 0
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%URL%'"
exit /b 0

:fallback
if defined NO_OPEN exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%WEB_DIR%\index.html'"
exit /b 0

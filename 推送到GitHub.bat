@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === ShanHe YiWen: push to GitHub ===
echo Repo: https://github.com/Tera-Dark/shanhe-yiwen
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git not found in PATH.
  echo Install Git for Windows, then reopen this window:
  echo   https://git-scm.com/download/win
  echo Or use "Git Bash" / GitHub Desktop to push.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Not a git repository: %CD%
  pause
  exit /b 1
)

echo Working directory:
cd
echo.
echo Status:
git status -sb
echo.
echo Recent commits:
git log -3 --oneline
echo.

echo Pushing: git push origin main
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo [FAILED] Push did not succeed.
  echo Common fixes:
  echo   1. Login: run "gh auth login" or sign in via Git Credential Manager
  echo   2. Check write access to Tera-Dark/shanhe-yiwen
  echo   3. In GitHub Desktop: Repository -^> Push
  echo.
  pause
  exit /b 1
)

echo.
echo [OK] Pushed to origin/main
echo Next - Vercel:
echo   https://vercel.com/new/clone?repository-url=https://github.com/Tera-Dark/shanhe-yiwen
echo Or read: web\DEPLOY.md
echo.
pause
exit /b 0

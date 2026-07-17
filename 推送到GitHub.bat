@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === 山河异闻 · 推送到 GitHub ===
echo 仓库: https://github.com/Tera-Dark/shanhe-yiwen
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [错误] 当前目录不是 Git 仓库。
  pause
  exit /b 1
)

git status -sb
echo.
git log -3 --oneline
echo.

echo 正在 git push origin main ...
git push origin main
if errorlevel 1 (
  echo.
  echo [失败] 推送未成功。常见原因：
  echo   1. 尚未登录 GitHub（Git Credential Manager / gh auth login）
  echo   2. 无仓库写权限
  echo   3. 远程地址不对
  echo.
  echo 可先执行: gh auth login
  echo 或在 GitHub Desktop 中 Push。
  pause
  exit /b 1
)

echo.
echo [完成] 已推送到 origin/main。
echo 下一步部署: 打开 https://vercel.com/new/clone?repository-url=https://github.com/Tera-Dark/shanhe-yiwen
echo 或见 web\DEPLOY.md
echo.
pause
exit /b 0

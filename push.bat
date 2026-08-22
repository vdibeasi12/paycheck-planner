@echo off
setlocal

set "PROJECT_DIR=C:\Users\Test-Laptop\paycheck-planner-UPDATED\paycheck-planner"

cd /d "%PROJECT_DIR%" || (
  echo Could not find %PROJECT_DIR%
  pause
  exit /b 1
)

git add -A
git commit -m "Homepage hero refresh: badge, larger gradient headline, de-boxed stats"
git push

echo.
echo Done. Check the output above for errors.
pause

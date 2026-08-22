@echo off
setlocal

set "PROJECT_DIR=C:\Users\Test-Laptop\paycheck-planner-UPDATED\paycheck-planner"

cd /d "%PROJECT_DIR%" || (
  echo Could not find %PROJECT_DIR%
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules not found -- running npm install first, this only happens once...
  call npm install
)

echo.
echo Starting the dev server. This window has to stay open while you're testing.
echo Once it says "ready", open http://localhost:3000 in your browser.
echo   - Resize the window narrow (or open DevTools device toolbar) to check the mobile layout.
echo   - Press Ctrl+C in this window to stop the server when you're done.
echo.

start "" http://localhost:3000
call npm run dev

pause

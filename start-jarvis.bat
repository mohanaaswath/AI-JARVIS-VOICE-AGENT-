@echo off
REM ============================================================
REM  JARVIS - Silent Background Web Launcher
REM  Launches the backend API & frontend server silently in the
REM  background without opening visible command prompt windows.
REM  Opens http://localhost:5173 directly in your browser.
REM ============================================================

set "PROJECT_DIR=%~dp0"
set "PYTHON=%PROJECT_DIR%venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

REM Start Backend silently in background (no cmd window)
powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Process -WindowStyle Hidden -FilePath '%PYTHON%' -ArgumentList '-m uvicorn app.main:app --port 8000' -WorkingDirectory '%PROJECT_DIR%backend'"

REM Start Frontend silently in background (no cmd window)
powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run dev' -WorkingDirectory '%PROJECT_DIR%frontend'"

REM Wait briefly for Vite dev server to bind and open browser
powershell.exe -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

exit /b 0

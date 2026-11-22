@echo off
REM ============================================
REM  JARVIS - One-click startup
REM  Starts the backend API (keys auto-load from
REM  frontend\.env) and the web website.
REM ============================================
title JARVIS Server

set "PYTHON=%~dp0venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

cd /d "%~dp0backend"
echo [JARVIS] Starting backend API on http://localhost:8000 ...
start "JARVIS Backend" cmd /k ""%PYTHON%" -m uvicorn app.main:app --port 8000"

echo [JARVIS] Starting web frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"
start "JARVIS Frontend" cmd /k npm run dev

echo.
echo [JARVIS] Waiting for the web dashboard...
set "FRONTEND_READY="
for /l %%I in (1,1,30) do (
    powershell.exe -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set "FRONTEND_READY=1"
        goto frontend_ready
    )
    ping -n 2 127.0.0.1 >nul
)

:frontend_ready
if defined FRONTEND_READY (
    echo [JARVIS] Opening http://localhost:5173 in your browser...
    start "" "http://localhost:5173"
) else (
    echo [JARVIS] WARNING: Frontend did not respond within 30 seconds.
    echo [JARVIS] Check the JARVIS Frontend terminal for errors.
)

echo [JARVIS] All services launched.
echo [JARVIS] (The dashboard should show status OK / LiveKit connected.)
echo.
if /i not "%~1"=="--no-pause" pause

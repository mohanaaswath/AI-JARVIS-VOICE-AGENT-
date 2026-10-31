@echo off
REM ============================================
REM  JARVIS - One-click startup
REM  Starts the backend API (keys auto-load from
REM  frontend\.env) and the voice agent.
REM ============================================
title JARVIS Server

set "PYTHON=%~dp0venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

cd /d "%~dp0backend"
echo [JARVIS] Starting backend API on http://localhost:8000 ...
start "JARVIS Backend" cmd /k ""%PYTHON%" -m uvicorn app.main:app --port 8000"

echo [JARVIS] Starting offline clap-activated voice agent ...
start "JARVIS Voice Agent" cmd /k ""%PYTHON%" local_agent.py"

echo [JARVIS] Starting web frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"
start "JARVIS Frontend" cmd /k npm run dev

echo.
echo [JARVIS] All services launched. Open http://localhost:5173 in your browser.
echo [JARVIS] (The dashboard should show status OK / LiveKit connected.)
echo.
if /i not "%~1"=="--no-pause" pause

@echo off
REM ============================================================
REM  JARVIS - Stop All Background Services
REM ============================================================
echo [JARVIS] Stopping background processes...

powershell.exe -NoProfile -Command "Get-Process -Name node,python,uvicorn -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*JARVISE*' -or $_.CommandLine -like '*app.main:app*' -or $_.CommandLine -like '*vite*' } | Stop-Process -Force -ErrorAction SilentlyContinue"

echo [JARVIS] Background services stopped.
exit /b 0

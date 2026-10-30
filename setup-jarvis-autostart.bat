@echo off
REM Register JARVIS to start automatically when this Windows user signs in.
set "LAUNCHER=%~dp0start-jarvis.bat"

fltmc >nul 2>&1
if errorlevel 1 (
    echo Administrator permission is required to register auto-start.
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

schtasks /Create /TN "JARVIS Auto Start" /SC ONLOGON /TR "\"%LAUNCHER%\" --no-pause" /F
if errorlevel 1 (
    echo.
    echo Failed to register JARVIS auto-start.
    pause
    exit /b 1
)

echo.
echo JARVIS auto-start is enabled for your Windows account.
echo It will start automatically at the next sign-in.
pause

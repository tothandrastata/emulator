@echo off
echo ============================================
echo TPN-MMU Emulator v1.0.0
echo ============================================
echo.

REM Check if .env exists, create from example if not
if not exist ".env" (
    echo No configuration found. Creating from template...
    copy .env.example .env
    echo.
    echo Configuration created! Edit .env if needed.
    echo.
    pause
)

echo Starting TPN-MMU emulator...
echo.
node main.js

pause

@echo off
REM IT-Engineering Collaboration Hub - Windows Launcher
REM Double-click this file to start the application

echo.
echo ========================================
echo   IT-Engineering Collaboration Hub
echo   Windows Launcher
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not installed or not in PATH
    echo Please install PowerShell and try again.
    pause
    exit /b 1
)

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Run the PowerShell script with execution policy bypass
echo Starting services...
echo.
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start.ps1" %*

REM If no arguments were provided, pause at the end
if "%~1"=="" (
    echo.
    pause
)

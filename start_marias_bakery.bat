@echo off
setlocal
REM Run from the folder containing this .bat file.
cd /d "%~dp0"
title Maria's Bakery - Launcher

echo ============================================
echo           MARIA'S BAKERY
echo ============================================

REM Check prerequisites.
where npm.cmd >nul 2>&1
if errorlevel 1 goto missing_node

where py >nul 2>&1
if errorlevel 1 (
    where python >nul 2>&1
    if errorlevel 1 goto missing_python
    set "PYTHON_CMD=python"
) else (
    set "PYTHON_CMD=py -3"
)

if not exist "backend\requirements.txt" goto missing_files
if not exist "frontend\package.json" goto missing_files

REM Set up backend only when needed.
if not exist "backend\.venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment...
    %PYTHON_CMD% -m venv "backend\.venv"
    if errorlevel 1 goto setup_failed
)

if not exist "backend\.venv\.setup-complete" (
    echo [2/4] Installing Python dependencies...
    "backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
    if errorlevel 1 goto setup_failed
    echo Setup completed> "backend\.venv\.setup-complete"
)

REM Install JavaScript packages on first run.
if not exist "frontend\node_modules" (
    echo [3/4] Installing frontend dependencies...
    pushd "frontend"
    call npm.cmd install
    if errorlevel 1 (
        popd
        goto setup_failed
    )
    popd
)

echo [4/4] Starting backend and frontend...
start "Maria Bakery - Backend" /D "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload"
start "Maria Bakery - Frontend" /D "%~dp0frontend" cmd /k "npm.cmd run dev"

echo.
echo Opening http://localhost:5173 ...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173/"
start "" "http://127.0.0.1:8000/docs"
echo.
echo The two server windows must remain open while using the app.
echo Close them or press Ctrl+C inside each window to stop.
echo.
pause
exit /b 0

:missing_node
echo ERROR: Node.js/npm is not installed or not in PATH.
echo Install Node.js LTS, then double-click this file again.
goto failed

:missing_python
echo ERROR: Python is not installed or not in PATH.
echo Install Python 3, then double-click this file again.
goto failed

:missing_files
echo ERROR: Run this launcher from the project root, next to backend and frontend.
goto failed

:setup_failed
echo ERROR: Setup failed. Check the message above.
echo If requirements.txt changed, delete backend\.venv\.setup-complete and retry.
goto failed

:failed
pause
exit /b 1

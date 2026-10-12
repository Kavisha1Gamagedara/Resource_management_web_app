@echo off
title PrimeWave Lab - Resource Reservation System
color 0B

echo ===================================================================
echo   PrimeWave Lab (Pvt) Ltd - Technical Assessment
echo   Resource Reservation Management System
echo ===================================================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check node_modules
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 3. Generate Prisma Client if needed
if not exist "node_modules\.prisma\client\" (
    echo [INFO] Generating Prisma client...
    call npx prisma generate
)

echo.
echo ===================================================================
echo   [SUCCESS] Full-Stack App is Ready!
echo   - Backend (Prisma ORM, PostgreSQL API, NextAuth): Ready
echo   - Frontend (React 19, Tailwind CSS, UI): Ready
echo.
echo   Opening in your browser: http://localhost:3000
echo   (Press Ctrl+C to stop the server at any time)
echo ===================================================================
echo.

:: Automatically launch browser after 2 seconds in background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Start the Next.js development server
call npm run dev
pause

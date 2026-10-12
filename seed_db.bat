@echo off
title PrimeWave Lab - Seed PostgreSQL Database
color 0A

echo ===================================================================
echo   PrimeWave Lab - Populating PostgreSQL Database with Demo Data
echo ===================================================================
echo.

call npm run db:seed

echo.
echo ===================================================================
echo   [DONE] Database has been seeded with demo users, resources,
echo          categories, and active reservations!
echo ===================================================================
pause

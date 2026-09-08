@echo off
title Expo / NPM Menu
color 0A

:menu
cls
echo ==============================
echo       SCEGLI UN COMANDO
echo ==============================
echo.
echo [1] npm install
echo [2] npm run web
echo [3] npx expo start -c
echo [4] npx expo start --tunnel
echo [0] Esci
echo.
echo Hai 5 secondi per scegliere...
echo.

choice /c 12340 /n /t 5 /d 2

if errorlevel 5 goto exit
if errorlevel 4 goto tunnel
if errorlevel 3 goto expo_clear
if errorlevel 2 goto web
if errorlevel 1 goto install

:install
cls
echo Eseguo: npm install
echo.
npm install
pause
goto menu

:web
cls
echo Eseguo: npm run web
echo.
npm run web
pause
goto menu

:expo_clear
cls
echo Eseguo: npm install ^&^& npx expo start -c
echo.
npm install && npx expo start -c
pause
goto menu

:tunnel
cls
echo Eseguo: npx expo start --tunnel
echo.
npx expo start --tunnel
pause
goto menu

:exit
exit
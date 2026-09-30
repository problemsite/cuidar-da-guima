@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js: https://nodejs.org/
  echo Ou abra o index.html direto (os sons em arquivo nao funcionam assim).
  pause
  exit /b 1
)
start "" http://localhost:8080
node servidor.js
pause

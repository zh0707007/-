$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$NodeModules = Join-Path $Frontend "node_modules"

function Fail($Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Write-Host ""
  exit 1
}

if (-not (Test-Path $Python)) {
  Fail "Backend virtualenv not found: backend\.venv. Create it and install backend dependencies first."
}

if (-not (Test-Path $NodeModules)) {
  Fail "Frontend dependencies not found: frontend\node_modules. Run npm.cmd install in frontend first."
}

$BackendCommand = "cd /d `"$Backend`" && `"$Python`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
$FrontendCommand = "cd /d `"$Frontend`" && npm.cmd run dev"

Write-Host "Starting Bazi project..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Bazi Backend && $BackendCommand"
Start-Sleep -Seconds 2
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Bazi Frontend && $FrontendCommand"

Write-Host "Opened two terminal windows: Bazi Backend and Bazi Frontend." -ForegroundColor Green
Write-Host "After the frontend compiler is ready, open http://localhost:3000" -ForegroundColor Green

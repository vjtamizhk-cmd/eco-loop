# Eco Loop Startup Script (PowerShell)
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Starting Eco Loop - Smart Waste Management System" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green

if (-Not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    py -3.12 -m venv .venv
    Write-Host "Installing requirements..." -ForegroundColor Cyan
    .\.venv\Scripts\pip.exe install -r requirements.txt
    .\.venv\Scripts\python.exe app\generate_assets.py
}

Write-Host "Launching Eco Loop on http://localhost:8000 ..." -ForegroundColor Yellow
.\.venv\Scripts\python.exe main.py

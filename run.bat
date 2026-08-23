@echo off
echo ===================================================
echo Starting Eco Loop - Smart Waste Management System
echo ===================================================

IF NOT EXIST ".venv" (
    echo Creating virtual environment...
    py -3.12 -m venv .venv
    echo Installing dependencies...
    .\.venv\Scripts\pip.exe install -r requirements.txt
    .\.venv\Scripts\python.exe app\generate_assets.py
)

echo Starting Eco Loop Server on http://localhost:8000 ...
.\.venv\Scripts\python.exe main.py
pause

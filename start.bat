@echo off
echo Starting ClassPulse...

if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

start cmd /k "cd backend && call venv\Scripts\activate && python run.py"
start cmd /k "cd frontend && npm run dev"

echo Backend started on http://localhost:8000
echo Frontend started on http://localhost:5173
echo.
echo Press any key to exit...
pause >nul

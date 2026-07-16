@echo off
echo Starting ClassPulse...

start cmd /k "cd backend && python run.py"
start cmd /k "cd frontend && npm run dev"

echo Backend started on http://localhost:8000
echo Frontend started on http://localhost:5173
echo.
echo Press any key to exit...
pause >nul

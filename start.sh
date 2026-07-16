#!/bin/bash
echo "Starting ClassPulse..."

# Start backend
cd backend
python run.py &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend started on http://localhost:8000"
echo "Frontend started on http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT
wait

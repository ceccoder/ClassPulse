# ClassPulse

A teacher dashboard for live online classes. Students interact through the live chat (e.g., YouTube Live), and the teacher manages polls, quizzes, attendance, leaderboards, and analytics from the ClassPulse dashboard.

## Tech Stack
*   **Backend:** FastAPI, Python, SQLAlchemy, SQLite, WebSockets
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, React Query, Chart.js

## Features
*   **Live Polls:** Create polls, students vote via chat (e.g., "A", "B"). Live updating charts.
*   **Quiz Mode:** Multiple choice quizzes with speed bonuses and points.
*   **Attendance:** Students type `#present` in chat.
*   **Raise Hand:** Students type `#hand` to enter the queue.
*   **Leaderboard:** Automatically updated based on quiz performance and poll participation.
*   **Activity Feed:** Real-time log of all class events.
*   **Presentation Mode:** Full-screen mode optimized for sharing or OBS.
*   **Reports:** Export attendance, leaderboards, polls, and quiz results to CSV.

## Requirements
*   Python 3.10+
*   Node.js 18+

## Setup & Run

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Run Application
Run the provided script from the project root:

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
./start.sh
```

### 4. Configuration
1.  Open the application at `http://localhost:5173`.
2.  Go to **Settings**.
3.  Enter your **YouTube Data API Key** to enable live chat integration.

## Usage
1.  Create a **New Session** from the Dashboard.
2.  Paste the **YouTube Video ID** (e.g., `dQw4w9WgXcQ`).
3.  Click **Start Session**. The app will connect to the live chat.
4.  Manage your class from the sidebar!

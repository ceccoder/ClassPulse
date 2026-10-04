# ClassPulse — YouTube Live Classroom Poll & Engagement System

**ClassPulse** is a real-time full-stack teacher dashboard designed for YouTube Live interactive classes. Teachers conduct live streams while students respond directly in the YouTube Live Chat. ClassPulse automatically fetches chat messages, detects valid poll responses, tracks real-time vote analytics, and renders live Chart.js visualizations—updating instantly via WebSockets without page refreshes.

---

## 🏗️ Architecture

```
YouTube Live Stream
       │
       ▼
YouTube Data API v3 (Live Chat API)
       │
       ▼
Backend Chat Listener & Poller (FastAPI)
       │
       ▼
Modular Vote Detection Engine (Regex & AI extensible)
       │
       ▼
Async SQLAlchemy Database (SQLite / PostgreSQL)
       │
       ▼
WebSocket Connection Manager (Real-time broadcasting)
       │
       ▼
Teacher Dashboard UI (React + Tailwind CSS + Chart.js)
```

---

## ✨ Core Features

### 1. YouTube Live Integration & Mock Simulator
- **Live Stream Connection:** Accepts YouTube video URLs or video IDs (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ` or `dQw4w9WgXcQ`).
- **Official API:** Uses the YouTube Data API v3 (`liveChatId` & `/liveChat/messages`) with adaptive polling intervals.
- **Resilient Polling:** Graceful handling of API rate limits, stream end, network disconnects, and errors.
- **Built-in Mock Chat Simulator:** Test the system instantly without needing an active YouTube stream or API key! Includes a live simulated student chat stream and custom message injection.

### 2. Teacher Dashboard & Real-Time Controls
- **Poll Management:** Create, edit, start, pause, resume, reset, and end polls.
- **Poll Properties:** Question, 2 to 6 options (with keyword shortcuts like A/B/C/D), optional correct answer, and optional auto-end duration timers (15s, 30s, 60s, 120s, 300s).
- **Live Visualizations:** Interactive Chart.js Bar & Doughnut charts updating live via WebSockets.
- **Live Metrics Bar:** Real-time stats for Active Students, Present Count (`#present`), Total Votes, and Responses Per Minute (RPM).
- **Live Chat & Vote Feed:** Dual-mode feed displaying incoming YouTube comments and highlighting detected votes (with Correct/Incorrect badges).

### 3. Automatic Vote Detection
- **Simple Formats:** `A`, `B`, `C`, `D`, `1`, `2`, `3`, `4`, `(A)`, `B.`, `1)`
- **Natural Language Formats:**
  - `"Option A"`, `"option 2"`, `"ans B"`, `"Answer is C"`
  - `"I choose B"`, `"I pick A"`, `"I vote 3"`
  - `"My answer is D"`, `"I think option C is correct"`
  - `"aaa"`, `"BBB"` (repeated letter votes)
- **Duplicate Prevention:** Prevents double voting from the same student on the same poll.
- **Modular AI Extension:** Built on `BaseVoteDetector` so AI/LLM natural language models can be plugged in seamlessly.

### 4. Poll Analytics & CSV Export
- Total participants & overall engagement percentage.
- Correct vs. Incorrect vote counts when a correct answer is set.
- Per-poll voter breakdown showing individual student votes.
- Instant CSV export for Poll Results, Attendance (`#present`), Leaderboards, and Quizzes.

---

## 🚀 Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Chart.js (`react-chartjs-2`), Zustand, TanStack React Query, Lucide Icons, React Hot Toast
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy (Async), Uvicorn, WebSockets, `httpx`, Pydantic v2
- **Database:** SQLite for local development (`classpulse.db`), PostgreSQL compatible (`asyncpg` ready for production)
- **APIs:** YouTube Data API v3

---

## 🛠️ Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 1. Clone & Configure Environment
Copy `.env.example` to create your local `.env` configuration file:
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# On Linux / macOS:
# source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 🔑 YouTube API Setup Instructions

To connect to live YouTube live streams:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services > Library** and enable **YouTube Data API v3**.
4. Navigate to **APIs & Services > Credentials** and click **Create Credentials > API Key**.
5. Copy your API Key.
6. Open the ClassPulse web dashboard, navigate to **Settings**, paste your API Key into the **YouTube API Key** field, and click **Save Settings**. Alternatively, add `YOUTUBE_API_KEY=your_key` to your `.env` file.

---

## 🏃 Running the Application

### Option A: One-Command Startup (Recommended)

**Windows:**
```cmd
start.bat
```

**Linux / macOS:**
```bash
chmod +x start.sh
./start.sh
```

### Option B: Manual Startup

**Backend Server:**
```bash
cd backend
python run.py
```
*(Backend runs on `http://localhost:8000`)*

**Frontend Server:**
```bash
cd frontend
npm run dev
```
*(Frontend dev server runs on `http://localhost:5173`)*

---

## 🧪 Testing with Mock Chat Simulator (No YouTube Key Required)

1. Open `http://localhost:5173` (or `http://localhost:8000`).
2. Click **New Live Class Session** and enter a title (e.g. *"Demo Physics Class"*).
3. On the Dashboard, click **Start Mock Stream** in the **Mock Chat Simulator** banner.
4. Go to **Polls** and click **Create Poll** (or launch a draft poll).
5. Watch simulated students vote live in real time! You can also type custom test messages in the simulator text box to verify natural language response parsing.

---

## 📦 Production Deployment (PostgreSQL + Render / Vercel / Heroku)

### Backend Deployment (Render / Heroku / Railway)
1. Set environment variables:
   - `DATABASE_URL`: `postgresql+asyncpg://user:password@host:5432/dbname`
   - `PORT`: `8000`
2. Run backend via Uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

### Frontend Deployment (Vercel / Netlify / Single Server)
- The FastAPI backend is configured to serve the Vite frontend static production bundle from `frontend/dist` automatically when built!
- To create a unified production build:
  ```bash
  cd frontend
  npm run build
  ```
- Running `python run.py` will serve both the REST API, WebSockets, and the frontend single-page application at `http://localhost:8000`.

---

## 📄 License
MIT License. Created for interactive live classroom engagement.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import PollsPage from '@/pages/PollsPage';
import QuizPage from '@/pages/QuizPage';
import AttendancePage from '@/pages/AttendancePage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ActivityPage from '@/pages/ActivityPage';
import ReportsPage from '@/pages/ReportsPage';
import HistoryPage from '@/pages/HistoryPage';
import PresentationPage from '@/pages/PresentationPage';
import OverlayPage from '@/pages/OverlayPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Presentation & Overlay widgets — stand-alone, no layout */}
        <Route path="/presentation" element={<PresentationPage />} />
        <Route path="/overlay" element={<OverlayPage />} />

        {/* Main app layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/polls" element={<PollsPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

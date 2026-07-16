import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Maximize2, Minimize2, Users, BarChart2, CheckCircle2 } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useSessionStore, usePollStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { POLL_COLORS, percentage } from '@/utils';
import { leaderboardApi } from '@/services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function PresentationPage() {
  const { activeSession } = useSessionStore();
  const { activePoll } = usePollStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Connect WS for this page specifically since it's a separate route
  useWebSocket(activeSession?.id ?? null);

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['stats-presentation', activeSession?.id],
    queryFn: () => activeSession ? leaderboardApi.getStats(activeSession.id) : null,
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!activeSession) {
    return (
      <div className="presentation-mode justify-center items-center">
        <Monitor size={64} className="mb-6 opacity-30 text-surface-500" />
        <h1 className="text-3xl font-bold text-surface-300">No Active Session</h1>
        <p className="text-surface-500 mt-2">Start a session in the dashboard to present</p>
      </div>
    );
  }

  return (
    <div className="presentation-mode bg-surface-950 text-white font-sans overflow-hidden">
      {/* Presentation Header */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-surface-800/60 bg-surface-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold shadow-lg shadow-brand-900/40">
            CP
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{activeSession.title}</h1>
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <span className="live-dot" /> Live Class Dashboard
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex gap-6 text-surface-300">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-accent-cyan" />
              <span className="text-xl font-bold tabular-nums">{stats?.total_students || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-accent-emerald" />
              <span className="text-xl font-bold tabular-nums">{stats?.present_count || 0}</span>
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-brand-400 tabular-nums tracking-wider">
            {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex p-8 gap-8">
        {/* Left: Active Poll or Empty State */}
        <div className="flex-[2] flex flex-col">
          {activePoll ? (
            <div className="flex-1 glass-card p-10 flex flex-col relative overflow-hidden border-brand-500/30 border-glow animate-fade-in">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-accent-violet" />
              <h2 className="text-3xl font-bold text-white mb-2">{activePoll.question}</h2>
              <p className="text-surface-400 text-lg mb-8">Type the letter in chat to vote!</p>

              <div className="flex-1 min-h-[300px]">
                <Bar
                  data={{
                    labels: activePoll.options.map(o => o.keyword),
                    datasets: [{
                      data: activePoll.options.map(o => o.vote_count),
                      backgroundColor: activePoll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length] + 'dd'),
                      borderColor: activePoll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length]),
                      borderWidth: 2,
                      borderRadius: 8,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: '#fff', font: { size: 24, weight: 'bold' } },
                        grid: { display: false }
                      },
                      y: {
                        ticks: { color: '#9aa3bf', font: { size: 16 }, stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                      }
                    }
                  }}
                />
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {activePoll.options.map((opt, i) => (
                  <div key={opt.id} className="bg-surface-900/50 border border-surface-800 rounded-xl p-4 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg"
                      style={{ backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}>
                      {opt.keyword}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-200 truncate">{opt.text}</div>
                      <div className="text-lg font-bold text-white tabular-nums">
                        {percentage(opt.vote_count, activePoll.total_votes)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 glass-card flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div className="w-32 h-32 mb-8 rounded-full bg-surface-800/50 flex items-center justify-center border-4 border-surface-700/50 shadow-inner">
                <BarChart2 size={64} className="text-surface-500" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Waiting for Activity...</h2>
              <p className="text-xl text-surface-400 max-w-lg mx-auto">
                No active poll right now. Start a poll from the dashboard to display it here.
              </p>
            </div>
          )}
        </div>

        {/* Right: Top Students Leaderboard */}
        <div className="flex-1 glass-card flex flex-col max-w-sm">
          <div className="p-6 border-b border-surface-800/60 bg-surface-900/30">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-accent-violet" /> Top Students
            </h2>
          </div>
          <div className="flex-1 overflow-y-hidden p-4 space-y-3">
            {stats?.top_students?.slice(0, 8).map((student: any, i: number) => (
              <div key={student.id} className="flex items-center gap-4 bg-surface-800/40 p-3 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg ${
                  i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-surface-700 text-surface-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white truncate">{student.name}</div>
                  <div className="text-xs text-surface-400 flex gap-3 mt-0.5">
                    <span>Quiz: <span className="text-accent-emerald font-medium">{student.quiz_score}</span></span>
                    <span>Polls: <span className="text-accent-violet font-medium">{student.poll_participations}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-brand-400 tabular-nums">{student.score}</div>
                </div>
              </div>
            ))}
            {(!stats?.top_students || stats.top_students.length === 0) && (
              <div className="text-center py-12 text-surface-500">
                <p>No students yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

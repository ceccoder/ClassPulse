import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Users, BarChart2, CheckCircle2, Clock, Layers } from 'lucide-react';
import { useSessionStore, usePollStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { POLL_COLORS, percentage } from '@/utils';
import { leaderboardApi, pollsApi } from '@/services/api';

export default function OverlayPage() {
  const { activeSession } = useSessionStore();
  const { activePoll, setPolls } = usePollStore();
  const [compact, setCompact] = useState(false);

  // Connect WebSocket
  useWebSocket(activeSession?.id ?? null);

  // Poll query
  useQuery({
    queryKey: ['overlay-polls', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      const data = await pollsApi.getBySession(activeSession.id);
      setPolls(data);
      return data;
    },
    enabled: !!activeSession,
    refetchInterval: 3000,
  });

  // Session Stats Query
  const { data: stats } = useQuery({
    queryKey: ['overlay-stats', activeSession?.id],
    queryFn: () => activeSession ? leaderboardApi.getStats(activeSession.id) : null,
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-surface-950/90 text-white flex items-center justify-center p-6 font-sans">
        <div className="glass-card p-6 text-center max-w-sm">
          <Monitor size={40} className="mx-auto mb-3 text-surface-500 opacity-40" />
          <h2 className="text-lg font-bold text-surface-200">No Active Session</h2>
          <p className="text-xs text-surface-400 mt-1">Start a session on ClassPulse dashboard to show widget overlay.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 font-sans flex flex-col justify-end items-end selection:bg-brand-500 selection:text-white">
      {/* Floating Controls Header (Top right) */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <button
          onClick={() => setCompact(!compact)}
          className="px-3 py-1.5 rounded-lg bg-surface-900/80 backdrop-blur-md border border-surface-700/60 text-xs font-semibold text-surface-300 hover:text-white hover:bg-surface-800 transition-all flex items-center gap-1.5 shadow-lg"
        >
          <Layers size={14} /> {compact ? 'Expand Widget' : 'Compact View'}
        </button>
      </div>

      {/* Main Overlay Widget Card */}
      <div className={`w-full max-w-md bg-surface-900/90 backdrop-blur-xl border border-surface-800/80 rounded-2xl p-4 shadow-2xl transition-all duration-300 ${compact ? 'scale-90 origin-bottom-right' : ''}`}>
        
        {/* Session Top Bar */}
        <div className="flex items-center justify-between border-b border-surface-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold shadow-md">
              CP
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight truncate max-w-[200px]">
                {activeSession.title}
              </h3>
              <p className="text-[10px] text-surface-400 flex items-center gap-1">
                <span className="live-dot" /> Live Class Widget
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-surface-300">
            <div className="flex items-center gap-1">
              <Users size={14} className="text-accent-cyan" />
              <span className="font-mono font-bold">{stats?.total_students || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-accent-emerald" />
              <span className="font-mono font-bold">{stats?.present_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Active Poll Widget Content */}
        {activePoll && activePoll.status === 'active' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                <span className="live-dot" /> Live Poll
              </span>
              <span className="text-xs font-mono font-semibold text-surface-300 bg-surface-800/60 px-2 py-0.5 rounded-md border border-surface-700/50">
                {activePoll.total_votes} votes
              </span>
            </div>

            <p className="text-sm font-semibold text-white leading-snug">
              {activePoll.question}
            </p>

            {/* Option Bars */}
            <div className="space-y-2 pt-1">
              {activePoll.options.map((opt, i) => {
                const pct = percentage(opt.vote_count, activePoll.total_votes);
                return (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded text-[11px] font-extrabold flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                        >
                          {opt.keyword}
                        </span>
                        <span className="text-surface-200 font-medium truncate max-w-[200px]">
                          {opt.text}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">{pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-surface-400">
            <BarChart2 size={28} className="mx-auto mb-1.5 opacity-30 text-surface-500" />
            <p className="text-xs font-medium text-surface-300">No active poll right now</p>
            <p className="text-[10px] text-surface-500 mt-0.5">Poll results will appear here live when started</p>
          </div>
        )}
      </div>
    </div>
  );
}

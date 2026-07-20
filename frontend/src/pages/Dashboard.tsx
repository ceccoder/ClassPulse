import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, CheckCircle, BarChart2, HelpCircle,
  Hand, Plus, Play, Square, Wifi, Radio
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sessionsApi, leaderboardApi, analyticsApi } from '@/services/api';
import { useSessionStore, usePollStore } from '@/store';
import { useWebSocket, useWSEvent } from '@/hooks/useWebSocket';
import { formatDateTime, formatRelativeTime, POLL_COLORS, percentage, extractYouTubeVideoId } from '@/utils';
import type { ClassSession } from '@/types';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { activeSession, setActiveSession } = useSessionStore();
  const { polls, activePoll, updatePoll } = usePollStore();
  const [showNewSession, setShowNewSession] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStreamId, setNewStreamId] = useState('');
  const [liveStudents, setLiveStudents] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [handCount, setHandCount] = useState(0);

  // Connect WS
  useWebSocket(activeSession?.id ?? null);

  // Handle real-time updates
  useWSEvent('new_student', () => {
    setLiveStudents(n => n + 1);
    queryClient.invalidateQueries({ queryKey: ['stats', activeSession?.id] });
  });
  useWSEvent('attendance_marked', () => {
    setPresentCount(n => n + 1);
  });
  useWSEvent('hand_raised', () => {
    setHandCount(n => n + 1);
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['stats', activeSession?.id],
    queryFn: () => activeSession ? leaderboardApi.getStats(activeSession.id) : null,
    enabled: !!activeSession,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (stats) {
      setLiveStudents(stats.total_students);
      setPresentCount(stats.present_count);
      setHandCount(stats.hand_raises || 0);
    }
  }, [stats]);

  // Create session
  const createSession = useMutation({
    mutationFn: () => sessionsApi.create({
      title: newTitle || `Class ${new Date().toLocaleDateString()}`,
      platform: 'youtube',
      stream_id: extractYouTubeVideoId(newStreamId) || undefined
    }),
    onSuccess: async (session: ClassSession) => {
      setActiveSession(session);
      setShowNewSession(false);
      setNewTitle('');
      setNewStreamId('');
      toast.success('Session created!');
      
      if (session.stream_id) {
        try {
          await sessionsApi.startPolling(session.id);
          toast.success('Started polling YouTube Live chat!');
          setActiveSession({ ...session, is_polling: true });
        } catch (err: any) {
          const detail = err?.response?.data?.detail || 'Failed to start polling YouTube Live chat. Ensure API key is configured.';
          toast.error(detail);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['serverActiveSession'] });
    },
    onError: () => toast.error('Failed to create session'),
  });

  // End session
  const endSession = useMutation({
    mutationFn: () => sessionsApi.update(activeSession!.id, { status: 'ended' }),
    onSuccess: () => {
      setActiveSession(null);
      toast.success('Session ended');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error: any) => {
      console.error('[EndSession] Error:', error);
      if (error?.response?.status === 404) {
        setActiveSession(null);
        toast.success('Session state cleared (not found on server)');
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      } else {
        toast.error('Failed to end session. Check console for details.');
      }
    },
  });

  // Start polling
  const startPolling = useMutation({
    mutationFn: () => sessionsApi.startPolling(activeSession!.id),
    onSuccess: () => {
      toast.success('YouTube polling started!');
      if (activeSession) {
        setActiveSession({ ...activeSession, is_polling: true });
      }
      queryClient.invalidateQueries({ queryKey: ['serverActiveSession'] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || 'Failed to start polling. Check YouTube API key and stream ID.';
      toast.error(detail);
    }
  });

  // Stop polling
  const stopPolling = useMutation({
    mutationFn: () => sessionsApi.stopPolling(activeSession!.id),
    onSuccess: () => {
      toast.success('YouTube polling stopped!');
      if (activeSession) {
        setActiveSession({ ...activeSession, is_polling: false });
      }
      queryClient.invalidateQueries({ queryKey: ['serverActiveSession'] });
    },
    onError: () => {
      toast.error('Failed to stop polling.');
    }
  });

  // Verify active session status on load and sync it with server database
  const { data: serverActiveSession, isSuccess } = useQuery({
    queryKey: ['serverActiveSession'],
    queryFn: () => sessionsApi.getActive(),
    refetchInterval: 20000, // check every 20 seconds
  });

  useEffect(() => {
    if (isSuccess) {
      // Sync local Zustand state with what is actually on the server database
      if (serverActiveSession) {
        if (!activeSession || activeSession.id !== serverActiveSession.id) {
          setActiveSession(serverActiveSession);
        }
      } else {
        if (activeSession) {
          setActiveSession(null);
        }
      }
    }
  }, [serverActiveSession, isSuccess, activeSession, setActiveSession]);

  const statCards = [
    {
      label: 'Students', value: liveStudents, icon: Users,
      color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/20'
    },
    {
      label: 'Present', value: presentCount, icon: CheckCircle,
      color: 'text-accent-emerald', bg: 'bg-accent-emerald/10', border: 'border-accent-emerald/20'
    },
    {
      label: 'Active Poll', value: activePoll ? '1' : '0', icon: BarChart2,
      color: 'text-brand-400', bg: 'bg-brand-600/10', border: 'border-brand-500/20'
    },
    {
      label: 'Hand Raises', value: handCount, icon: Hand,
      color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            {activeSession
              ? `Managing: ${activeSession.title}`
              : 'Start a new session to begin'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeSession && (
            <>
              {activeSession.is_polling ? (
                <button
                  onClick={() => stopPolling.mutate()}
                  className="btn-secondary text-accent-emerald border-accent-emerald/30 hover:bg-accent-emerald/10 flex items-center gap-2"
                  disabled={stopPolling.isPending}
                >
                  <Wifi size={16} className="animate-pulse" />
                  Polling Live
                </button>
              ) : (
                <button
                  onClick={() => startPolling.mutate()}
                  className="btn-secondary text-surface-400 hover:text-white flex items-center gap-2"
                  disabled={startPolling.isPending}
                >
                  <Wifi size={16} className="opacity-50" />
                  Start Polling
                </button>
              )}
            </>
          )}
          {activeSession ? (
            <button
              onClick={() => endSession.mutate()}
              className="btn-danger flex items-center gap-2"
            >
              <Square size={16} />
              End Session
            </button>
          ) : (
            <button
              onClick={() => setShowNewSession(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Session
            </button>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4 animate-slide-up">
            <h2 className="text-lg font-semibold text-white">Create New Session</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-surface-400 mb-1 block">Session Title</label>
                <input
                  className="input"
                  placeholder="e.g., Week 3 - JavaScript Basics"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-1 block">YouTube Video ID (optional)</label>
                <input
                  className="input font-mono"
                  placeholder="e.g., dQw4w9WgXcQ"
                  value={newStreamId}
                  onChange={e => setNewStreamId(e.target.value)}
                />
                <p className="text-xs text-surface-500 mt-1">
                  From your YouTube live stream URL: youtube.com/watch?v=<strong>VIDEO_ID</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => createSession.mutate()}
                className="btn-primary flex-1"
                disabled={createSession.isPending}
              >
                {createSession.isPending ? 'Creating...' : 'Create Session'}
              </button>
              <button
                onClick={() => setShowNewSession(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`glass-card p-5 border ${border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-surface-400 text-sm font-medium">{label}</span>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${color} number-roll tabular-nums`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Poll */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <BarChart2 size={18} className="text-brand-400" />
              Active Poll
            </h2>
            {activePoll && (
              <span className="badge-active">
                <span className="live-dot mr-1.5" />
                Live
              </span>
            )}
          </div>

          {activePoll ? (
            <div className="space-y-4">
              <p className="text-white font-medium">{activePoll.question}</p>
              <div className="space-y-3">
                {activePoll.options.map((opt, i) => {
                  const pct = percentage(opt.vote_count, activePoll.total_votes);
                  return (
                    <div key={opt.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white"
                            style={{ backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                          >
                            {opt.keyword}
                          </span>
                          <span className="text-sm text-surface-200">{opt.text}</span>
                        </div>
                        <span className="text-sm font-semibold text-white tabular-nums">
                          {opt.vote_count} <span className="text-surface-500 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-surface-700/60 rounded-full overflow-hidden">
                        <div
                          className="poll-bar h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: POLL_COLORS[i % POLL_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-surface-500 text-right">
                {activePoll.total_votes} total votes
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-surface-500">
              <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active poll</p>
              <p className="text-xs mt-1">Go to Polls to create one</p>
            </div>
          )}
        </div>

        {/* Top Students */}
        <div className="glass-card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Users size={18} className="text-accent-violet" />
            Top Students
          </h2>
          {stats?.top_students?.length ? (
            <div className="space-y-2">
              {stats.top_students.map((student: {
                id: number; name: string; score: number;
                quiz_score: number; avatar_url: string | null
              }, i: number) => (
                <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-800/40 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-surface-700 text-surface-300'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-violet flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {student.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-surface-200 truncate">{student.name}</span>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-sm font-bold text-brand-400 tabular-nums">{student.score}</div>
                      <div className="text-xs text-surface-500">pts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-500">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No students yet</p>
              <p className="text-xs mt-1">Students appear when they chat</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Info */}
      {activeSession && (
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Session Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-surface-500 mb-1">Platform</div>
              <div className="text-white capitalize flex items-center gap-1.5">
                <Radio size={14} className="text-accent-rose" />
                {activeSession.platform}
              </div>
            </div>
            <div>
              <div className="text-surface-500 mb-1">Started</div>
              <div className="text-white">{formatRelativeTime(activeSession.created_at)}</div>
            </div>
            <div>
              <div className="text-surface-500 mb-1">Stream ID</div>
              <div className="text-white font-mono text-xs truncate">
                {activeSession.stream_id || '—'}
              </div>
            </div>
            <div>
              <div className="text-surface-500 mb-1">Status</div>
              <div className="flex items-center gap-2">
                <span className="badge-active">Active</span>
                {activeSession.is_polling ? (
                  <span className="text-accent-emerald text-xs flex items-center gap-1 bg-accent-emerald/10 px-2 py-0.5 rounded border border-accent-emerald/20">
                    <span className="live-dot" /> Polling Live
                  </span>
                ) : (
                  <span className="text-surface-400 text-xs flex items-center gap-1 bg-surface-800 px-2 py-0.5 rounded border border-surface-700">
                    Polling Idle
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

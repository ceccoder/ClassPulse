import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, CheckCircle, BarChart2, Hand, Plus, Play, Pause, Square, RotateCcw,
  Wifi, Radio, Zap, Check, HelpCircle, AlertCircle, Clock, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sessionsApi, leaderboardApi, analyticsApi, pollsApi } from '@/services/api';
import { useSessionStore, usePollStore } from '@/store';
import { useWebSocket, useWSEvent } from '@/hooks/useWebSocket';
import { formatDateTime, formatRelativeTime, POLL_COLORS, percentage, extractYouTubeVideoId } from '@/utils';
import PollChart from '@/components/PollChart';
import LiveChatFeed from '@/components/LiveChatFeed';
import type { ClassSession, Poll } from '@/types';

const DEFAULT_4_OPTIONS = [
  { text: 'Option A', keyword: 'A' },
  { text: 'Option B', keyword: 'B' },
  { text: 'Option C', keyword: 'C' },
  { text: 'Option D', keyword: 'D' },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { activeSession, setActiveSession } = useSessionStore();
  const { polls, activePoll, setPolls, updatePoll } = usePollStore();
  const [showNewSession, setShowNewSession] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  // Session form state
  const [newTitle, setNewTitle] = useState('');
  const [newStreamId, setNewStreamId] = useState('');

  // Poll form state on Dashboard
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAllowChange, setPollAllowChange] = useState(true);
  const [pollCorrectKeyword, setPollCorrectKeyword] = useState('');
  const [pollDurationSeconds, setPollDurationSeconds] = useState<number | null>(30);
  const [pollOptions, setPollOptions] = useState(DEFAULT_4_OPTIONS);

  const [liveStudents, setLiveStudents] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const [chartType, setChartType] = useState<'bar' | 'doughnut'>('bar');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Connect WS
  useWebSocket(activeSession?.id ?? null);

  // Polls query to keep active poll synced on Dashboard
  useQuery({
    queryKey: ['dashboard-polls', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      const data = await pollsApi.getBySession(activeSession.id);
      setPolls(data);
      return data;
    },
    enabled: !!activeSession,
    refetchInterval: 3000,
  });

  // Analytics query for RPM & overview
  const { data: analyticsOverview } = useQuery({
    queryKey: ['analytics-overview', activeSession?.id],
    queryFn: () => activeSession ? analyticsApi.getOverview(activeSession.id) : null,
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  // Handle poll duration timer
  useEffect(() => {
    if (activePoll && activePoll.status === 'active' && activePoll.started_at && activePoll.duration_seconds) {
      const startTime = new Date(activePoll.started_at).getTime();
      const endTime = startTime + activePoll.duration_seconds * 1000;
      
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [activePoll]);

  // Real-time WS events
  useWSEvent('new_student', () => {
    setLiveStudents(n => n + 1);
    queryClient.invalidateQueries({ queryKey: ['stats', activeSession?.id] });
  });
  useWSEvent('attendance_marked', () => setPresentCount(n => n + 1));
  useWSEvent('hand_raised', () => setHandCount(n => n + 1));

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['stats', activeSession?.id],
    queryFn: () => activeSession ? leaderboardApi.getStats(activeSession.id) : null,
    enabled: !!activeSession,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (stats) {
      setLiveStudents(stats.total_students);
      setPresentCount(stats.present_count);
      setHandCount(stats.hand_raises || 0);
    }
  }, [stats]);

  // Poll actions
  const createAndLaunchPoll = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No active session");
      const created = await pollsApi.create({
        session_id: activeSession.id,
        question: pollQuestion.trim() || 'Live Class Poll (A/B/C/D)',
        options: pollOptions.map(o => ({ ...o, text: o.text.trim() || `Option ${o.keyword}` })),
        allow_vote_change: pollAllowChange,
        correct_keyword: pollCorrectKeyword || null,
        duration_seconds: pollDurationSeconds || null,
      });
      return pollsApi.start(created.id);
    },
    onSuccess: (pollData) => {
      toast.success('Poll created & launched live!');
      setShowCreatePoll(false);
      setPollQuestion('');
      setPollCorrectKeyword('');
      setPollDurationSeconds(30);
      setPollOptions(DEFAULT_4_OPTIONS);
      updatePoll(pollData);
      queryClient.invalidateQueries({ queryKey: ['dashboard-polls', activeSession?.id] });
    },
    onError: () => toast.error('Failed to launch poll'),
  });

  const startPollMutation = useMutation({
    mutationFn: (pollId: number) => pollsApi.start(pollId),
    onSuccess: (data) => {
      updatePoll(data);
      toast.success('Poll started!');
    }
  });

  const pausePollMutation = useMutation({
    mutationFn: (pollId: number) => pollsApi.pause(pollId),
    onSuccess: (data) => {
      updatePoll(data);
      toast.success('Poll paused.');
    }
  });

  const resumePollMutation = useMutation({
    mutationFn: (pollId: number) => pollsApi.resume(pollId),
    onSuccess: (data) => {
      updatePoll(data);
      toast.success('Poll resumed.');
    }
  });

  const endPollMutation = useMutation({
    mutationFn: (pollId: number) => pollsApi.end(pollId),
    onSuccess: (data) => {
      updatePoll(data);
      toast.success('Poll ended.');
    }
  });

  const resetPollMutation = useMutation({
    mutationFn: (pollId: number) => pollsApi.reset(pollId),
    onSuccess: (data) => {
      updatePoll(data);
      toast.success('Poll reset.');
    }
  });

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
          const detail = err?.response?.data?.detail || 'Ensure a valid YouTube Live stream URL or ID is provided.';
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
    onError: () => {
      setActiveSession(null);
      toast.success('Session ended');
    }
  });

  // Start / Stop Polling
  const startPolling = useMutation({
    mutationFn: () => sessionsApi.startPolling(activeSession!.id),
    onSuccess: () => {
      toast.success('YouTube Live polling started!');
      if (activeSession) setActiveSession({ ...activeSession, is_polling: true });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || 'Ensure a valid YouTube live stream URL or video ID is provided.';
      toast.error(detail);
    }
  });

  const stopPolling = useMutation({
    mutationFn: () => sessionsApi.stopPolling(activeSession!.id),
    onSuccess: () => {
      toast.success('YouTube Live polling stopped.');
      if (activeSession) setActiveSession({ ...activeSession, is_polling: false });
    },
  });

  // Sync server active session
  const { data: serverActiveSession, isSuccess } = useQuery({
    queryKey: ['serverActiveSession'],
    queryFn: () => sessionsApi.getActive(),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (isSuccess) {
      if (serverActiveSession) {
        if (!activeSession || activeSession.id !== serverActiveSession.id) {
          setActiveSession(serverActiveSession);
        }
      }
    }
  }, [serverActiveSession, isSuccess, activeSession, setActiveSession]);

  const activePollSummary = analyticsOverview?.polls?.find((p: any) => p.id === activePoll?.id);

  const addPollOption = () => {
    if (pollOptions.length >= 6) return;
    const next = String.fromCharCode(65 + pollOptions.length);
    setPollOptions([...pollOptions, { text: '', keyword: next }]);
  };

  const removePollOption = (i: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, idx) => idx !== i));
  };

  const statCards = [
    {
      label: 'Students Active', value: liveStudents, icon: Users,
      color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/20'
    },
    {
      label: 'Present (#present)', value: presentCount, icon: CheckCircle,
      color: 'text-accent-emerald', bg: 'bg-accent-emerald/10', border: 'border-accent-emerald/20'
    },
    {
      label: 'Total Votes Recorded', value: activePoll ? activePoll.total_votes : (analyticsOverview?.total_votes || 0), icon: BarChart2,
      color: 'text-brand-400', bg: 'bg-brand-600/10', border: 'border-brand-500/20'
    },
    {
      label: 'Responses / Min', value: activePollSummary?.responses_per_minute || 0, icon: Zap,
      color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Classroom Live Dashboard
            {activeSession?.is_polling && (
              <span className="badge-active text-xs py-0.5">
                <span className="live-dot mr-1" /> YouTube Live Active
              </span>
            )}
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">
            {activeSession
              ? `Session: ${activeSession.title}`
              : 'Create or select a session to start collecting votes'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeSession && (
            <>
              {/* PROMINENT CREATE POLL BUTTON ON HOME PAGE */}
              <button
                onClick={() => setShowCreatePoll(true)}
                className="btn-primary flex items-center gap-2 font-bold px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-500/25"
              >
                <Plus size={18} />
                Create Poll
              </button>

              {activeSession.is_polling ? (
                <button
                  onClick={() => stopPolling.mutate()}
                  className="btn-secondary text-accent-emerald border-accent-emerald/30 hover:bg-accent-emerald/10 flex items-center gap-2"
                  disabled={stopPolling.isPending}
                >
                  <Wifi size={16} className="animate-pulse" />
                  YouTube Polling Active
                </button>
              ) : (
                <button
                  onClick={() => startPolling.mutate()}
                  className="btn-secondary text-surface-400 hover:text-white flex items-center gap-2"
                  disabled={startPolling.isPending}
                >
                  <Wifi size={16} className="opacity-50" />
                  Connect YouTube Chat
                </button>
              )}

              <button
                onClick={() => endSession.mutate()}
                className="btn-danger flex items-center gap-2"
              >
                <Square size={16} />
                End Session
              </button>
            </>
          )}

          {!activeSession && (
            <button
              onClick={() => setShowNewSession(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Live Class Session
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`glass-card p-5 border ${border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-surface-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
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

      {/* Main Content Grid: Live Poll & Chart + Live Chat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Poll & Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <BarChart2 size={20} className="text-brand-400" />
                <h2 className="text-lg font-semibold text-white">Live Poll</h2>
                {activePoll && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    activePoll.status === 'active' ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30' :
                    activePoll.status === 'paused' ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30' :
                    'bg-surface-700 text-surface-300'
                  }`}>
                    {activePoll.status.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Chart type toggle */}
              {activePoll && (
                <div className="flex items-center gap-1 bg-surface-800 p-1 rounded-lg border border-surface-700">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      chartType === 'bar' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Bar Chart
                  </button>
                  <button
                    onClick={() => setChartType('doughnut')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      chartType === 'doughnut' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Doughnut
                  </button>
                </div>
              )}
            </div>

            {activePoll ? (
              <div className="space-y-6">
                {/* Question & Timer header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-900/60 p-4 rounded-xl border border-surface-800">
                  <div>
                    <h3 className="text-base font-bold text-white">{activePoll.question}</h3>
                    {activePoll.correct_keyword && (
                      <p className="text-xs text-accent-emerald font-medium mt-1 flex items-center gap-1">
                        <Check size={14} /> Correct Answer Configured: Option {activePoll.correct_keyword}
                      </p>
                    )}
                  </div>

                  {/* Timer */}
                  {timeLeft !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/30 text-accent-amber font-mono font-bold text-sm whitespace-nowrap">
                      <Clock size={16} />
                      {timeLeft}s remaining
                    </div>
                  )}
                </div>

                {/* Chart Visualization */}
                <PollChart
                  options={activePoll.options}
                  totalVotes={activePoll.total_votes}
                  chartType={chartType}
                  correctKeyword={activePoll.correct_keyword}
                />

                {/* Options Progress Bars */}
                <div className="space-y-3 pt-2">
                  {activePoll.options.map((opt, i) => {
                    const pct = percentage(opt.vote_count, activePoll.total_votes);
                    const isCorrect = activePoll.correct_keyword && opt.keyword.toUpperCase() === activePoll.correct_keyword.toUpperCase();

                    return (
                      <div key={opt.id} className="p-3 rounded-lg bg-surface-900/40 border border-surface-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white"
                              style={{ backgroundColor: isCorrect ? '#10b981' : POLL_COLORS[i % POLL_COLORS.length] }}
                            >
                              {opt.keyword}
                            </span>
                            <span className="text-sm font-medium text-surface-100">{opt.text}</span>
                            {isCorrect && (
                              <span className="text-[10px] bg-accent-emerald/20 text-accent-emerald px-1.5 py-0.5 rounded font-bold border border-accent-emerald/30">
                                Correct Answer
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-white tabular-nums">
                            {opt.vote_count} <span className="text-surface-500 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                          <div
                            className="poll-bar h-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isCorrect ? '#10b981' : POLL_COLORS[i % POLL_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Poll Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-surface-800">
                  <div className="text-xs text-surface-400">
                    Total Votes: <strong className="text-white">{activePoll.total_votes}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {activePoll.status === 'active' && (
                      <button
                        onClick={() => pausePollMutation.mutate(activePoll.id)}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Pause size={14} /> Pause
                      </button>
                    )}
                    {activePoll.status === 'paused' && (
                      <button
                        onClick={() => resumePollMutation.mutate(activePoll.id)}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <Play size={14} /> Resume
                      </button>
                    )}
                    {activePoll.status === 'draft' && (
                      <button
                        onClick={() => startPollMutation.mutate(activePoll.id)}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <Play size={14} /> Start Poll
                      </button>
                    )}
                    {(activePoll.status === 'active' || activePoll.status === 'paused') && (
                      <button
                        onClick={() => endPollMutation.mutate(activePoll.id)}
                        className="btn-danger text-xs flex items-center gap-1.5"
                      >
                        <Square size={14} /> End Poll
                      </button>
                    )}
                    <button
                      onClick={() => resetPollMutation.mutate(activePoll.id)}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-surface-500">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-30 text-brand-400" />
                <p className="text-base font-medium text-surface-300">No poll currently active</p>
                <p className="text-xs mt-1 text-surface-500 max-w-sm mx-auto mb-4">
                  Create a poll right here on your dashboard to start receiving live student responses.
                </p>
                {activeSession && (
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4"
                  >
                    <Plus size={16} /> Create Poll Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Chat & Detected Responses (5 cols) */}
        <div className="lg:col-span-5">
          <LiveChatFeed />
        </div>
      </div>

      {/* CREATE POLL MODAL DIRECTLY ON DASHBOARD HOME PAGE */}
      {showCreatePoll && activeSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart2 size={20} className="text-brand-400" />
              Create & Launch Poll Live
            </h2>

            <div>
              <label className="text-sm text-surface-400 mb-1 block font-medium">Poll Question</label>
              <input
                className="input"
                placeholder="Ask your students (e.g. What is the output of line 4?)"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
              />
            </div>

            {/* Duration & Correct Answer Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-surface-400 mb-1 flex items-center gap-1.5 block font-medium">
                  <Clock size={14} className="text-brand-400" /> Duration Timer
                </label>
                <select
                  value={pollDurationSeconds ?? ''}
                  onChange={e => setPollDurationSeconds(e.target.value ? Number(e.target.value) : null)}
                  className="input text-xs"
                >
                  <option value="">No Duration (Manual End)</option>
                  <option value="15">15 Seconds</option>
                  <option value="30">30 Seconds</option>
                  <option value="60">60 Seconds (1 Min)</option>
                  <option value="120">120 Seconds (2 Mins)</option>
                  <option value="300">300 Seconds (5 Mins)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-surface-400 mb-1 flex items-center gap-1.5 block font-medium">
                  <Check size={14} className="text-accent-emerald" /> Correct Answer (Optional)
                </label>
                <select
                  value={pollCorrectKeyword}
                  onChange={e => setPollCorrectKeyword(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">None (Survey / Opinion)</option>
                  {pollOptions.map(opt => (
                    <option key={opt.keyword} value={opt.keyword}>
                      Option {opt.keyword} ({opt.text || `Option ${opt.keyword}`})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-surface-400 font-medium">Poll Options (2-6 options)</label>
                {pollOptions.length < 6 && (
                  <button onClick={addPollOption} className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                    + Add Option
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div
                      className="w-8 h-8 rounded text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                    >
                      {opt.keyword}
                    </div>
                    <input
                      className="input flex-1 text-xs"
                      placeholder={`Option ${opt.keyword}`}
                      value={opt.text}
                      onChange={e => {
                        const updated = [...pollOptions];
                        updated[i] = { ...updated[i], text: e.target.value };
                        setPollOptions(updated);
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(i)} className="btn-icon text-accent-rose">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={pollAllowChange}
                onChange={e => setPollAllowChange(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-surface-300">Allow students to change vote during active poll</span>
            </label>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => createAndLaunchPoll.mutate()}
                className="btn-primary flex-1 py-2.5 font-semibold text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-500/25"
                disabled={createAndLaunchPoll.isPending}
              >
                {createAndLaunchPoll.isPending ? 'Launching...' : 'Create & Launch Poll Live'}
              </button>
              <button onClick={() => setShowCreatePoll(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="e.g., Physics Live Lecture 4"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-1 block">YouTube Video URL or ID (optional)</label>
                <input
                  className="input font-mono"
                  placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  value={newStreamId}
                  onChange={e => setNewStreamId(e.target.value)}
                />
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
    </div>
  );
}

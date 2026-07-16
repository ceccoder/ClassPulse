import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Play, Pause, RotateCcw, StopCircle, Trash2,
  BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { pollsApi } from '@/services/api';
import { useSessionStore, usePollStore } from '@/store';
import { useWSEvent } from '@/hooks/useWebSocket';
import { POLL_COLORS, percentage } from '@/utils';
import type { Poll } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function PollsPage() {
  const queryClient = useQueryClient();
  const activeSession = useSessionStore(s => s.activeSession);
  const { polls, setPolls, updatePoll, activePoll } = usePollStore();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPoll, setExpandedPoll] = useState<number | null>(null);

  // Poll form state
  const [question, setQuestion] = useState('');
  const [allowChange, setAllowChange] = useState(true);
  const [options, setOptions] = useState([
    { text: '', keyword: 'A' },
    { text: '', keyword: 'B' },
  ]);

  // WS live updates
  useWSEvent('poll_vote', (data) => {
    queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] });
  });

  // Load polls
  useQuery({
    queryKey: ['polls', activeSession?.id],
    queryFn: async () => {
      const data = await pollsApi.getBySession(activeSession!.id);
      setPolls(data);
      return data;
    },
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const createPoll = useMutation({
    mutationFn: () => pollsApi.create({
      session_id: activeSession!.id,
      question,
      options: options.filter(o => o.text.trim()),
      allow_vote_change: allowChange,
    }),
    onSuccess: (poll: Poll) => {
      toast.success('Poll created!');
      setShowCreate(false);
      setQuestion('');
      setOptions([{ text: '', keyword: 'A' }, { text: '', keyword: 'B' }]);
      queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] });
    },
    onError: () => toast.error('Failed to create poll'),
  });

  const mutate = (fn: () => Promise<Poll>, successMsg: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (poll) => {
        updatePoll(poll);
        toast.success(successMsg);
        queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] });
      },
      onError: () => toast.error('Operation failed'),
    });

  const addOption = () => {
    const next = String.fromCharCode(65 + options.length);
    setOptions([...options, { text: '', keyword: next }]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge-active"><span className="live-dot mr-1.5"/>Live</span>;
      case 'paused': return <span className="badge-paused">Paused</span>;
      case 'ended': return <span className="badge-ended">Ended</span>;
      default: return <span className="badge-draft">Draft</span>;
    }
  };

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <BarChart2 size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Create a session from the Dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Polls</h1>
          <p className="text-surface-400 text-sm mt-1">
            {polls.length} polls · {activePoll ? '1 live' : 'none live'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Poll
        </button>
      </div>

      {/* Create Poll Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white">Create Poll</h2>

            <div>
              <label className="text-sm text-surface-400 mb-1 block">Question</label>
              <input
                className="input"
                placeholder="Ask your students..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-surface-400">Options</label>
                <button onClick={addOption} className="text-xs text-brand-400 hover:text-brand-300">
                  + Add option
                </button>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div
                      className="w-8 h-8 rounded text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                    >
                      {opt.keyword}
                    </div>
                    <input
                      className="input flex-1"
                      placeholder={`Option ${opt.keyword}`}
                      value={opt.text}
                      onChange={e => {
                        const updated = [...options];
                        updated[i] = { ...updated[i], text: e.target.value };
                        setOptions(updated);
                      }}
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="btn-icon text-accent-rose">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowChange}
                onChange={e => setAllowChange(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-surface-300">Allow vote changes</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => createPoll.mutate()}
                className="btn-primary flex-1"
                disabled={!question.trim() || options.filter(o => o.text.trim()).length < 2 || createPoll.isPending}
              >
                Create Poll
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="glass-card p-12 text-center text-surface-500">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-surface-300 font-medium mb-1">No polls yet</p>
            <p className="text-sm">Create your first poll to engage students</p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              expanded={expandedPoll === poll.id}
              onToggle={() => setExpandedPoll(expandedPoll === poll.id ? null : poll.id)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, expanded, onToggle, onUpdate }: {
  poll: Poll;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const queryClient = useQueryClient();

  const action = (fn: () => Promise<Poll>, msg: string) => async () => {
    try {
      await fn();
      toast.success(msg);
      onUpdate();
    } catch {
      toast.error('Operation failed');
    }
  };

  const chartData = {
    labels: poll.options.map(o => `${o.keyword}: ${o.text}`),
    datasets: [{
      data: poll.options.map(o => o.vote_count),
      backgroundColor: poll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length] + 'cc'),
      borderColor: poll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length]),
      borderWidth: 1,
    }]
  };

  const barData = {
    labels: poll.options.map(o => o.keyword),
    datasets: [{
      data: poll.options.map(o => o.vote_count),
      backgroundColor: poll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length] + 'aa'),
      borderColor: poll.options.map((_, i) => POLL_COLORS[i % POLL_COLORS.length]),
      borderWidth: 2,
      borderRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: '#9aa3bf' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: {
        ticks: { color: '#9aa3bf', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge-active"><span className="live-dot mr-1.5"/>Live</span>;
      case 'paused': return <span className="badge-paused">Paused</span>;
      case 'ended': return <span className="badge-ended">Ended</span>;
      default: return <span className="badge-draft">Draft</span>;
    }
  };

  return (
    <div className={`glass-card transition-all duration-200 ${poll.status === 'active' ? 'border-brand-500/30 border-glow' : ''}`}>
      {/* Poll header */}
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge(poll.status)}
            <span className="text-xs text-surface-500">{poll.total_votes} votes</span>
          </div>
          <p className="text-white font-medium truncate">{poll.question}</p>
          <p className="text-xs text-surface-500 mt-1">{poll.options.length} options</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {poll.status === 'draft' && (
            <button
              onClick={action(() => pollsApi.start(poll.id), 'Poll started!')}
              className="btn-success flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              <Play size={12} /> Start
            </button>
          )}
          {poll.status === 'active' && (
            <>
              <button
                onClick={action(() => pollsApi.pause(poll.id), 'Poll paused')}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Pause size={12} /> Pause
              </button>
              <button
                onClick={action(() => pollsApi.end(poll.id), 'Poll ended')}
                className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <StopCircle size={12} /> End
              </button>
            </>
          )}
          {poll.status === 'paused' && (
            <>
              <button
                onClick={action(() => pollsApi.resume(poll.id), 'Poll resumed!')}
                className="btn-success flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Play size={12} /> Resume
              </button>
              <button
                onClick={action(() => pollsApi.end(poll.id), 'Poll ended')}
                className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <StopCircle size={12} /> End
              </button>
            </>
          )}
          {(poll.status === 'ended' || poll.status === 'draft') && (
            <button
              onClick={action(() => pollsApi.reset(poll.id), 'Poll reset')}
              className="btn-icon"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={async () => {
              await pollsApi.delete(poll.id);
              onUpdate();
            }}
            className="btn-icon text-accent-rose"
          >
            <Trash2 size={14} />
          </button>
          <button onClick={onToggle} className="btn-icon">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded: Results */}
      {expanded && (
        <div className="border-t border-surface-800/60 p-4 space-y-4 animate-fade-in">
          {/* Bar chart */}
          <div className="max-h-48">
            <Bar data={barData} options={chartOptions as never} />
          </div>

          {/* Options with bars */}
          <div className="space-y-2">
            {poll.options.map((opt, i) => {
              const pct = percentage(opt.vote_count, poll.total_votes);
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between mb-1">
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
                      {opt.vote_count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-700/60 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: POLL_COLORS[i % POLL_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Play, Pause, RotateCcw, StopCircle, Trash2, Edit, Download,
  BarChart2, ChevronDown, ChevronUp, Clock, Check, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { pollsApi, reportsApi } from '@/services/api';
import { useSessionStore, usePollStore } from '@/store';
import { useWSEvent } from '@/hooks/useWebSocket';
import { POLL_COLORS, percentage } from '@/utils';
import type { Poll } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DEFAULT_4_OPTIONS = [
  { text: 'Option A', keyword: 'A' },
  { text: 'Option B', keyword: 'B' },
  { text: 'Option C', keyword: 'C' },
  { text: 'Option D', keyword: 'D' },
];

export default function PollsPage() {
  const queryClient = useQueryClient();
  const activeSession = useSessionStore(s => s.activeSession);
  const { polls, setPolls, updatePoll, activePoll } = usePollStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [expandedPoll, setExpandedPoll] = useState<number | null>(null);

  // Poll form state
  const [question, setQuestion] = useState('');
  const [allowChange, setAllowChange] = useState(true);
  const [correctKeyword, setCorrectKeyword] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number | null>(30);
  const [options, setOptions] = useState(DEFAULT_4_OPTIONS);

  // Active poll live countdown state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // WS live updates
  useWSEvent('poll_vote', () => {
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
    refetchInterval: 3000,
  });

  const savePoll = useMutation({
    mutationFn: async () => {
      const payload = {
        session_id: activeSession!.id,
        question: question.trim() || 'Quick Poll (A/B/C/D)',
        options: options.map(o => ({ ...o, text: o.text.trim() || `Option ${o.keyword}` })),
        allow_vote_change: allowChange,
        correct_keyword: correctKeyword || null,
        duration_seconds: durationSeconds || null,
      };

      if (editingPollId) {
        return pollsApi.update(editingPollId, payload);
      } else {
        return pollsApi.create(payload);
      }
    },
    onSuccess: async (poll: Poll) => {
      toast.success(editingPollId ? 'Poll updated!' : 'Poll created!');
      setShowCreate(false);
      setEditingPollId(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] });
    },
    onError: () => toast.error('Failed to save poll'),
  });

  const resetForm = () => {
    setQuestion('');
    setAllowChange(true);
    setCorrectKeyword('');
    setDurationSeconds(30);
    setOptions(DEFAULT_4_OPTIONS);
  };

  const handleOpenCreateModal = () => {
    setEditingPollId(null);
    resetForm();
    setShowCreate(true);
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPollId(poll.id);
    setQuestion(poll.question);
    setAllowChange(poll.allow_vote_change);
    setCorrectKeyword(poll.correct_keyword || '');
    setDurationSeconds(poll.duration_seconds || null);
    setOptions(poll.options.map(o => ({ text: o.text, keyword: o.keyword })));
    setShowCreate(true);
  };

  const addOption = () => {
    if (options.length >= 6) {
      toast.error('Maximum 6 options allowed.');
      return;
    }
    const next = String.fromCharCode(65 + options.length);
    setOptions([...options, { text: '', keyword: next }]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) {
      toast.error('Minimum 2 options required.');
      return;
    }
    setOptions(options.filter((_, idx) => idx !== i));
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
          <h1 className="text-2xl font-bold text-white">Poll Management</h1>
          <p className="text-surface-400 text-sm mt-1">
            {polls.length} total polls · {activePoll ? '1 currently active' : 'none active'}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={reportsApi.exportPollsCsv(activeSession.id)}
            download
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <Download size={14} />
            Export Polls CSV
          </a>
          <button onClick={handleOpenCreateModal} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Create Poll
          </button>
        </div>
      </div>

      {/* Create / Edit Poll Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white">
              {editingPollId ? 'Edit Poll' : 'Create Poll'}
            </h2>

            <div>
              <label className="text-sm text-surface-400 mb-1 block">Poll Question</label>
              <input
                className="input"
                placeholder="What is the answer to question 1?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            {/* Duration Dropdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-surface-400 mb-1 flex items-center gap-1.5 block">
                  <Clock size={14} className="text-brand-400" /> Duration Timer
                </label>
                <select
                  value={durationSeconds ?? ''}
                  onChange={e => setDurationSeconds(e.target.value ? Number(e.target.value) : null)}
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

              {/* Correct Answer Dropdown */}
              <div>
                <label className="text-sm text-surface-400 mb-1 flex items-center gap-1.5 block">
                  <Check size={14} className="text-accent-emerald" /> Correct Answer (Optional)
                </label>
                <select
                  value={correctKeyword}
                  onChange={e => setCorrectKeyword(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">None (Survey / Opinion)</option>
                  {options.map(opt => (
                    <option key={opt.keyword} value={opt.keyword}>
                      Option {opt.keyword} ({opt.text || `Option ${opt.keyword}`})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options List (2 to 6 options) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-surface-400">Poll Options (2-6 options)</label>
                {options.length < 6 && (
                  <button onClick={addOption} className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                    + Add Option
                  </button>
                )}
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
                      className="input flex-1 text-xs"
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

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={allowChange}
                onChange={e => setAllowChange(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-surface-300">Allow students to change vote during active poll</span>
            </label>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => savePoll.mutate()}
                className="btn-primary flex-1 py-2.5 font-semibold text-sm"
                disabled={savePoll.isPending}
              >
                {savePoll.isPending ? 'Saving...' : (editingPollId ? 'Save Changes' : 'Create Poll')}
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
            <p className="text-surface-300 font-medium mb-1">No polls created yet</p>
            <p className="text-sm">Click Create Poll above to start</p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCardItem
              key={poll.id}
              poll={poll}
              expanded={expandedPoll === poll.id}
              onToggle={() => setExpandedPoll(expandedPoll === poll.id ? null : poll.id)}
              onEdit={() => handleEditPoll(poll)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['polls', activeSession?.id] })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PollCardItem({ poll, expanded, onToggle, onEdit, onUpdate }: {
  poll: Poll;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}) {
  const { data: voters = [] } = useQuery({
    queryKey: ['poll-voters', poll.id],
    queryFn: () => pollsApi.getVoters(poll.id),
    enabled: expanded,
    refetchInterval: expanded ? 3000 : false,
  });

  const action = (fn: () => Promise<Poll>, msg: string) => async () => {
    try {
      await fn();
      toast.success(msg);
      onUpdate();
    } catch {
      toast.error('Operation failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge-active"><span className="live-dot mr-1.5" />Active</span>;
      case 'paused': return <span className="badge-paused">Paused</span>;
      case 'ended': return <span className="badge-ended">Ended</span>;
      default: return <span className="badge-draft">Draft</span>;
    }
  };

  return (
    <div className={`glass-card transition-all duration-200 ${poll.status === 'active' ? 'border-brand-500/40 border-glow' : ''}`}>
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {getStatusBadge(poll.status)}
            {poll.correct_keyword && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 font-semibold">
                Correct: {poll.correct_keyword}
              </span>
            )}
            {poll.duration_seconds && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-surface-800 text-surface-400 border border-surface-700 font-mono">
                {poll.duration_seconds}s
              </span>
            )}
            <span className="text-xs text-surface-500">{poll.total_votes} votes total</span>
          </div>

          <h3 className="text-base font-semibold text-white">{poll.question}</h3>
          <p className="text-xs text-surface-400 mt-1">
            {poll.options.map(o => `${o.keyword}: ${o.text}`).join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {poll.status === 'draft' && (
            <>
              <button
                onClick={onEdit}
                className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1.5"
                title="Edit Poll"
              >
                <Edit size={12} /> Edit
              </button>
              <button
                onClick={action(() => pollsApi.start(poll.id), 'Poll started!')}
                className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Play size={12} /> Start
              </button>
            </>
          )}

          {poll.status === 'active' && (
            <>
              <button
                onClick={action(() => pollsApi.pause(poll.id), 'Poll paused')}
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Pause size={12} /> Pause
              </button>
              <button
                onClick={action(() => pollsApi.end(poll.id), 'Poll ended')}
                className="btn-danger text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <StopCircle size={12} /> End
              </button>
            </>
          )}

          {poll.status === 'paused' && (
            <>
              <button
                onClick={action(() => pollsApi.resume(poll.id), 'Poll resumed!')}
                className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Play size={12} /> Resume
              </button>
              <button
                onClick={action(() => pollsApi.end(poll.id), 'Poll ended')}
                className="btn-danger text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <StopCircle size={12} /> End
              </button>
            </>
          )}

          {(poll.status === 'ended' || poll.status === 'draft') && (
            <button
              onClick={action(() => pollsApi.reset(poll.id), 'Poll reset')}
              className="btn-icon"
              title="Reset Poll Votes"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            onClick={async () => {
              await pollsApi.delete(poll.id);
              onUpdate();
              toast.success('Poll deleted');
            }}
            className="btn-icon text-accent-rose hover:bg-accent-rose/10"
            title="Delete Poll"
          >
            <Trash2 size={14} />
          </button>

          <button onClick={onToggle} className="btn-icon">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-800 p-4 space-y-4 animate-fade-in">
          <div className="space-y-3">
            {poll.options.map((opt, i) => {
              const pct = percentage(opt.vote_count, poll.total_votes);
              const isCorrect = poll.correct_keyword && opt.keyword.toUpperCase() === poll.correct_keyword.toUpperCase();
              const optionVoters = voters.filter(v => v.option_id === opt.id);

              return (
                <div key={opt.id} className="bg-surface-900/60 p-3 rounded-lg border border-surface-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: isCorrect ? '#10b981' : POLL_COLORS[i % POLL_COLORS.length] }}
                      >
                        {opt.keyword}
                      </span>
                      <span className="text-sm font-medium text-surface-200">{opt.text}</span>
                      {isCorrect && (
                        <span className="text-[10px] bg-accent-emerald/20 text-accent-emerald px-1.5 py-0.5 rounded font-bold border border-accent-emerald/30">
                          Correct Answer
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white tabular-nums">
                      {opt.vote_count} votes ({pct}%)
                    </span>
                  </div>

                  <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isCorrect ? '#10b981' : POLL_COLORS[i % POLL_COLORS.length]
                      }}
                    />
                  </div>

                  {optionVoters.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-surface-800 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-surface-400 font-medium">Voters:</span>
                      {optionVoters.map((v) => (
                        <span
                          key={v.vote_id}
                          className="px-2 py-0.5 rounded bg-surface-800 text-[11px] text-brand-300 border border-surface-700"
                        >
                          {v.student_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

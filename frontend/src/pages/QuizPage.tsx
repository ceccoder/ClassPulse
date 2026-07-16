import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Plus, Play, Pause, Trash2, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { quizApi } from '@/services/api';
import { useSessionStore } from '@/store';
import { formatTime, POLL_COLORS } from '@/utils';
import type { Quiz, QuizQuestion } from '@/types';

export default function QuizPage() {
  const queryClient = useQueryClient();
  const activeSession = useSessionStore(s => s.activeSession);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(10);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [questions, setQuestions] = useState([
    { question: '', correct_answer: 'A', options: [''], order: 0 }
  ]);

  // Load quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', activeSession?.id],
    queryFn: () => quizApi.getBySession(activeSession!.id),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const createQuiz = useMutation({
    mutationFn: () => quizApi.create({
      session_id: activeSession!.id,
      title,
      time_limit_seconds: timeLimit,
      points_per_correct: points,
      speed_bonus: speedBonus,
      questions: questions.map(q => ({
        ...q,
        options: q.options.filter(o => o.trim())
      }))
    }),
    onSuccess: () => {
      toast.success('Quiz created!');
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['quizzes', activeSession?.id] });
    },
    onError: () => toast.error('Failed to create quiz'),
  });

  const resetForm = () => {
    setTitle('');
    setTimeLimit(30);
    setPoints(10);
    setSpeedBonus(true);
    setQuestions([{ question: '', correct_answer: 'A', options: [''], order: 0 }]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', correct_answer: 'A', options: [''], order: questions.length }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <HelpCircle size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Create a session from the Dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quizzes</h1>
          <p className="text-surface-400 text-sm mt-1">{quizzes.length} quizzes created</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Quiz
        </button>
      </div>

      {/* Create Quiz Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-6 animate-slide-up">
            <h2 className="text-xl font-semibold text-white">Create Quiz</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-surface-400 mb-1 block">Quiz Title</label>
                <input className="input" placeholder="e.g. Midterm Review" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-1 block">Time Limit (sec)</label>
                <input type="number" className="input" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-1 block">Points per Question</label>
                <input type="number" className="input" value={points} onChange={e => setPoints(Number(e.target.value))} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={speedBonus} onChange={e => setSpeedBonus(e.target.checked)} className="rounded" />
              <span className="text-sm text-surface-300">Enable speed bonus (+50% for fast answers)</span>
            </label>

            <div className="border-t border-surface-800/60 pt-4 space-y-6">
              <h3 className="text-lg font-medium text-white flex items-center justify-between">
                Questions
                <button onClick={addQuestion} className="btn-secondary text-xs py-1">Add Question</button>
              </h3>

              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-surface-900/50 p-4 rounded-lg border border-surface-800 space-y-3 relative">
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qIdx)} className="absolute top-3 right-3 text-surface-500 hover:text-accent-rose">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <p className="text-xs font-semibold text-brand-400 uppercase">Question {qIdx + 1}</p>
                  <input className="input" placeholder="Question text..." value={q.question} onChange={e => {
                    const newQ = [...questions];
                    newQ[qIdx].question = e.target.value;
                    setQuestions(newQ);
                  }} />

                  <div className="space-y-2 mt-2">
                    <label className="text-xs text-surface-400">Options (Leave blank to remove)</label>
                    {[0, 1, 2, 3].map(optIdx => {
                      const kw = String.fromCharCode(65 + optIdx);
                      return (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                              q.correct_answer === kw ? 'bg-accent-emerald text-white border border-accent-emerald/50 border-glow-green' : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
                            }`}
                            onClick={() => {
                              const newQ = [...questions];
                              newQ[qIdx].correct_answer = kw;
                              setQuestions(newQ);
                            }}
                            title="Set as correct answer"
                          >
                            {kw}
                          </button>
                          <input className="input py-1 text-sm flex-1" placeholder={`Option ${kw}`} value={q.options[optIdx] || ''} onChange={e => {
                            const newQ = [...questions];
                            newQ[qIdx].options[optIdx] = e.target.value;
                            setQuestions(newQ);
                          }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-surface-800/60">
              <button
                onClick={() => createQuiz.mutate()}
                className="btn-primary flex-1"
                disabled={!title.trim() || createQuiz.isPending}
              >
                Create Quiz
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz List */}
      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <div className="glass-card p-12 text-center text-surface-500">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-surface-300 font-medium mb-1">No quizzes yet</p>
          </div>
        ) : (
          quizzes.map((quiz: Quiz) => (
            <div key={quiz.id} className={`glass-card ${quiz.status === 'active' ? 'border-brand-500/30 border-glow' : ''}`}>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {quiz.status === 'active' ? (
                      <span className="badge-active"><span className="live-dot mr-1.5"/>Live</span>
                    ) : quiz.status === 'ended' ? (
                      <span className="badge-ended">Ended</span>
                    ) : (
                      <span className="badge-draft">Draft</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
                  <p className="text-sm text-surface-400 mt-0.5">
                    {quiz.questions.length} questions · {quiz.points_per_correct} pts/q
                  </p>
                </div>
                <div className="flex gap-2">
                  {quiz.status === 'draft' && (
                    <button onClick={async () => {
                      await quizApi.start(quiz.id);
                      queryClient.invalidateQueries({ queryKey: ['quizzes', activeSession?.id] });
                      toast.success('Quiz started!');
                    }} className="btn-success text-sm py-1.5">Start Quiz</button>
                  )}
                  {quiz.status === 'active' && (
                    <button onClick={async () => {
                      await quizApi.end(quiz.id);
                      queryClient.invalidateQueries({ queryKey: ['quizzes', activeSession?.id] });
                      toast.success('Quiz ended');
                    }} className="btn-danger text-sm py-1.5">End Quiz</button>
                  )}
                  <button onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)} className="btn-secondary text-sm py-1.5">
                    {expandedQuiz === quiz.id ? 'Hide Details' : 'Manage'}
                  </button>
                  <button onClick={async () => {
                    await quizApi.delete(quiz.id);
                    queryClient.invalidateQueries({ queryKey: ['quizzes', activeSession?.id] });
                  }} className="btn-icon text-accent-rose"><Trash2 size={16}/></button>
                </div>
              </div>

              {expandedQuiz === quiz.id && (
                <div className="border-t border-surface-800/60 p-4 animate-fade-in bg-surface-900/30">
                  <div className="space-y-3">
                    {quiz.questions.map((q, idx) => (
                      <div key={q.id} className={`p-4 rounded-lg border transition-all ${q.is_active ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-800 bg-surface-800/30'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-brand-400">Q{idx + 1}</span>
                              {q.is_active && <span className="badge-active text-[10px] py-0">Active</span>}
                            </div>
                            <p className="text-sm font-medium text-white mb-3">{q.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt, i) => {
                                const kw = String.fromCharCode(65 + i);
                                const isCorrect = kw === q.correct_answer;
                                return (
                                  <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${isCorrect ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-surface-900 text-surface-400'}`}>
                                    <span className="font-bold">{kw}</span> {opt}
                                    {isCorrect && <CheckCircle2 size={12} className="ml-auto" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {quiz.status === 'active' && (
                            <button
                              onClick={async () => {
                                await quizApi.activateQuestion(quiz.id, q.id);
                                queryClient.invalidateQueries({ queryKey: ['quizzes', activeSession?.id] });
                                toast.success(`Question ${idx + 1} pushed to students!`);
                              }}
                              className={`btn-${q.is_active ? 'secondary' : 'primary'} text-xs px-3 py-1.5`}
                            >
                              {q.is_active ? 'Re-push' : 'Push Live'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Leaderboard preview if ended/active */}
                  {quiz.status !== 'draft' && (
                    <QuizLeaderboard quizId={quiz.id} />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuizLeaderboard({ quizId }: { quizId: number }) {
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['quiz-leaderboard', quizId],
    queryFn: () => quizApi.leaderboard(quizId),
    refetchInterval: 5000,
  });

  if (!leaderboard.length) return null;

  return (
    <div className="mt-6 border-t border-surface-800/60 pt-4">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Trophy size={14} className="text-accent-amber" /> Quiz Leaderboard
      </h4>
      <div className="space-y-2">
        {leaderboard.slice(0, 5).map((l: any, i: number) => (
          <div key={l.student_id} className="flex items-center gap-3 bg-surface-800/50 p-2 rounded-lg">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-surface-700 text-surface-400'
            }`}>{i + 1}</span>
            <span className="flex-1 text-sm font-medium text-white">{l.name}</span>
            <span className="text-xs text-surface-400">{l.correct}/{l.total} correct</span>
            <span className="text-sm font-bold text-accent-emerald w-12 text-right">{l.total_points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

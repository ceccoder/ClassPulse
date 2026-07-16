import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Download, Search } from 'lucide-react';
import { leaderboardApi, reportsApi } from '@/services/api';
import { useSessionStore } from '@/store';
import { downloadUrl, formatDateTime } from '@/utils';
import type { Student } from '@/types';

export default function LeaderboardPage() {
  const activeSession = useSessionStore(s => s.activeSession);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard', activeSession?.id, sortBy],
    queryFn: () => leaderboardApi.getBySession(activeSession!.id, 50, sortBy),
    enabled: !!activeSession,
    refetchInterval: 10000, // Every 10s
  });

  const filtered = leaderboard.filter((s: Student) =>
    s.display_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <Trophy size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Create a session from the Dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-accent-amber" /> Leaderboard
          </h1>
          <p className="text-surface-400 text-sm mt-1">Top 50 students in this session</p>
        </div>
        <button
          onClick={() => downloadUrl(reportsApi.exportLeaderboardCsv(activeSession.id), `leaderboard_${activeSession.id}.csv`)}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 3 Podium (only if sorting by score) */}
        {sortBy === 'score' && filtered.length >= 3 && (
          <div className="md:col-span-3 flex justify-center items-end gap-4 h-48 mb-8">
            {/* Rank 2 */}
            <PodiumPosition student={filtered[1]} rank={2} height="h-32" color="from-slate-300 to-slate-400" text="text-surface-900" />
            {/* Rank 1 */}
            <PodiumPosition student={filtered[0]} rank={1} height="h-40" color="from-amber-400 to-yellow-500" text="text-surface-900" />
            {/* Rank 3 */}
            <PodiumPosition student={filtered[2]} rank={3} height="h-28" color="from-amber-600 to-amber-700" text="text-white" />
          </div>
        )}

        <div className="md:col-span-3 glass-card">
          <div className="p-4 border-b border-surface-800/60 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search student..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Sort by:</span>
              <select
                className="input py-1.5 w-auto"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="score">Total Score</option>
                <option value="quiz_score">Quiz Score</option>
                <option value="polls">Poll Participations</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-16 text-center">Rank</th>
                  <th className="table-header">Student</th>
                  <th className="table-header text-right">Total Score</th>
                  <th className="table-header text-right">Quiz Score</th>
                  <th className="table-header text-center">Polls</th>
                  <th className="table-header text-right">First Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-surface-500 text-sm">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filtered.map((student: Student, idx: number) => (
                    <tr key={student.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="table-cell text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'bg-surface-800 text-surface-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                            {student.display_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{student.display_name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <span className="font-bold text-brand-400">{student.score}</span>
                      </td>
                      <td className="table-cell text-right text-accent-emerald">
                        {student.quiz_score}
                      </td>
                      <td className="table-cell text-center text-accent-violet">
                        {student.poll_participations}
                      </td>
                      <td className="table-cell text-right text-surface-400 text-xs font-mono">
                        {formatDateTime(student.first_seen).split(' ')[1]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PodiumPosition({ student, rank, height, color, text }: any) {
  return (
    <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: `${rank * 100}ms` }}>
      <div className="mb-2 text-center">
        <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-lg ${text} mb-1 shadow-lg shadow-black/50 border-2 border-surface-950`}>
          {student.display_name[0]?.toUpperCase()}
        </div>
        <div className="text-sm font-bold text-white max-w-[100px] truncate">{student.display_name}</div>
        <div className="text-xs font-mono text-brand-400">{student.score} pts</div>
      </div>
      <div className={`w-24 ${height} bg-gradient-to-t ${color} rounded-t-lg flex justify-center pt-2 shadow-2xl relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <span className={`relative text-2xl font-black ${text}`}>{rank}</span>
      </div>
    </div>
  );
}

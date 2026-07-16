import { useQuery } from '@tanstack/react-query';
import { FileText, Download, BarChart2, Users, CheckCircle } from 'lucide-react';
import { reportsApi, sessionsApi } from '@/services/api';
import { useSessionStore } from '@/store';
import { downloadUrl, formatDateTime, percentage } from '@/utils';
import type { SessionSummary } from '@/types';

export default function ReportsPage() {
  const activeSession = useSessionStore(s => s.activeSession);

  const { data: summary } = useQuery({
    queryKey: ['report-summary', activeSession?.id],
    queryFn: () => reportsApi.getSummary(activeSession!.id),
    enabled: !!activeSession,
  });

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <FileText size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Select a past session in History or start a new one.</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-brand-400" /> Session Report
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {activeSession.title} ({formatDateTime(activeSession.created_at)})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExportCard
          title="Attendance"
          icon={<CheckCircle className="text-accent-emerald" />}
          count={summary.present_count}
          url={reportsApi.exportAttendanceCsv(activeSession.id)}
          filename={`attendance_${activeSession.id}.csv`}
        />
        <ExportCard
          title="Leaderboard"
          icon={<Users className="text-accent-cyan" />}
          count={summary.student_count}
          url={reportsApi.exportLeaderboardCsv(activeSession.id)}
          filename={`leaderboard_${activeSession.id}.csv`}
        />
        <ExportCard
          title="Polls"
          icon={<BarChart2 className="text-accent-violet" />}
          count={summary.poll_count}
          url={reportsApi.exportPollsCsv(activeSession.id)}
          filename={`polls_${activeSession.id}.csv`}
        />
        <ExportCard
          title="Quiz Results"
          icon={<FileText className="text-accent-amber" />}
          count={'-'}
          url={reportsApi.exportQuizCsv(activeSession.id)}
          filename={`quiz_${activeSession.id}.csv`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Top 10 Students</h2>
          <div className="space-y-2">
            {summary.top_students.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 rounded hover:bg-surface-800/40">
                <div className="flex items-center gap-3">
                  <span className="text-surface-500 font-mono text-xs w-4">{i + 1}.</span>
                  <span className="text-white text-sm">{s.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-400 font-bold text-sm">{s.score}</span>
                  <span className="text-surface-500 text-xs ml-1">pts</span>
                </div>
              </div>
            ))}
            {summary.top_students.length === 0 && (
              <p className="text-surface-500 text-sm text-center py-4">No data</p>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Poll Summaries</h2>
          <div className="space-y-6">
            {summary.polls.map((p: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-medium text-white mb-2">{p.question}</p>
                <div className="space-y-1">
                  {p.options.map((o: any) => (
                    <div key={o.keyword} className="flex items-center text-xs">
                      <span className="w-6 font-bold text-surface-400">{o.keyword}</span>
                      <span className="flex-1 text-surface-300 truncate pr-2">{o.text}</span>
                      <span className="w-12 text-right text-white font-medium">{o.votes}</span>
                      <span className="w-12 text-right text-surface-500">{percentage(o.votes, p.total_votes)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {summary.polls.length === 0 && (
              <p className="text-surface-500 text-sm text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ title, icon, count, url, filename }: any) {
  return (
    <div className="glass-card p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          {icon} {title}
        </h3>
        <span className="text-2xl font-bold text-surface-200">{count}</span>
      </div>
      <div className="mt-auto pt-4 border-t border-surface-800/60">
        <button
          onClick={() => downloadUrl(url, filename)}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Download size={14} /> Download CSV
        </button>
      </div>
    </div>
  );
}

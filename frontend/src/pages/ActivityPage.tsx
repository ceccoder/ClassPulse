import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Search, Trash2, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { activityApi } from '@/services/api';
import { useSessionStore, useActivityStore } from '@/store';
import { formatTime, EVENT_ICONS, EVENT_COLORS } from '@/utils';
import type { ActivityLog } from '@/types';

export default function ActivityPage() {
  const queryClient = useQueryClient();
  const activeSession = useSessionStore(s => s.activeSession);
  const { activities, addActivity } = useActivityStore();
  const [filter, setFilter] = useState('all');

  // Initial load
  useQuery({
    queryKey: ['activity', activeSession?.id],
    queryFn: async () => {
      const data = await activityApi.getBySession(activeSession!.id, 200);
      // We don't populate store on initial load to avoid overwriting live data
      // Just showing fetched data if store is empty
      if (activities.length === 0) {
        data.reverse().forEach((a: ActivityLog) => addActivity(a));
      }
      return data;
    },
    enabled: !!activeSession && activities.length === 0,
  });

  const clearActivity = useMutation({
    mutationFn: () => activityApi.clear(activeSession!.id),
    onSuccess: () => {
      // Clear store (would need a clear method, just reloading for now)
      window.location.reload();
    }
  });

  const filtered = activities.filter(a => filter === 'all' || a.event_type.includes(filter));

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <Zap size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Create a session from the Dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-accent-cyan" /> Live Activity
          </h1>
          <p className="text-surface-400 text-sm mt-1">Real-time feed of all class events</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-surface-900 rounded-lg p-1 border border-surface-700/50">
            <Filter size={14} className="text-surface-400 ml-2" />
            <select
              className="bg-transparent text-sm text-white focus:outline-none pr-2 py-1"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="poll">Polls</option>
              <option value="quiz">Quizzes</option>
              <option value="attendance">Attendance</option>
              <option value="hand_raise">Hands</option>
            </select>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear all activity logs for this session?')) {
                clearActivity.mutate();
              }
            }}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      <div className="glass-card p-4 min-h-[60vh] max-h-[75vh] overflow-y-auto no-scrollbar relative">
        <div className="absolute top-0 bottom-0 left-8 w-px bg-surface-800/60 z-0 hidden md:block" />

        <div className="space-y-4 relative z-10">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-surface-500 text-sm">
              No activity yet... Waiting for events.
            </div>
          ) : (
            filtered.map((log: ActivityLog) => (
              <div key={log.id} className="activity-item group">
                <div className="w-12 h-8 flex items-center justify-center flex-shrink-0 text-surface-500 text-xs font-mono">
                  {formatTime(log.created_at)}
                </div>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg shadow-sm border border-surface-700 bg-surface-900 group-hover:border-surface-600 transition-colors`}>
                  {EVENT_ICONS[log.event_type] || '⚡'}
                </div>

                <div className="ml-2 flex-1 pt-1.5">
                  <p className="text-sm text-surface-200">
                    {log.student_name && (
                      <span className={`font-semibold mr-1 ${EVENT_COLORS[log.event_type] || 'text-white'}`}>
                        {log.student_name}
                      </span>
                    )}
                    <span dangerouslySetInnerHTML={{
                      __html: log.description.replace(
                        log.student_name || '',
                        ''
                      ).trim()
                    }} />
                  </p>
                  {log.metadata_json && (
                    <div className="mt-1.5 p-2 rounded bg-surface-900/50 border border-surface-800/50 text-xs text-surface-400 font-mono">
                      {log.metadata_json}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

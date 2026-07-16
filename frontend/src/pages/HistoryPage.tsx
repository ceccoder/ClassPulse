import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Play, Trash2, Calendar, Radio } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sessionsApi } from '@/services/api';
import { useSessionStore } from '@/store';
import { formatDateTime, formatRelativeTime } from '@/utils';
import type { ClassSession } from '@/types';

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { activeSession, setActiveSession } = useSessionStore();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
  });

  const loadSession = (session: ClassSession) => {
    setActiveSession(session);
    toast.success(`Loaded session: ${session.title}`);
  };

  const deleteSession = useMutation({
    mutationFn: (id: number) => sessionsApi.delete(id),
    onSuccess: (_, deletedId) => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (activeSession?.id === deletedId) {
        setActiveSession(null);
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="text-brand-400" /> Session History
          </h1>
          <p className="text-surface-400 text-sm mt-1">Review or reload past class sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-surface-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-surface-300 font-medium">No sessions found</p>
            <p className="text-sm mt-1">Sessions you create will appear here.</p>
          </div>
        ) : (
          sessions.map((session: ClassSession) => (
            <div key={session.id} className={`glass-card p-5 relative overflow-hidden group transition-all hover:border-brand-500/30 ${
              activeSession?.id === session.id ? 'border-brand-500/50 shadow-[0_0_15px_rgba(99,112,240,0.1)]' : ''
            }`}>
              {activeSession?.id === session.id && (
                <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  CURRENT
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 pr-4">
                  <h3 className="font-semibold text-white truncate" title={session.title}>
                    {session.title}
                  </h3>
                  <p className="text-xs text-surface-400 mt-1 flex items-center gap-1.5">
                    <Radio size={12} className="text-accent-rose" />
                    {session.platform}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-500">Created:</span>
                  <span className="text-surface-200">{formatDateTime(session.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-500">Status:</span>
                  {session.status === 'active' ? (
                    <span className="badge-active">Live</span>
                  ) : (
                    <span className="badge-ended">Ended</span>
                  )}
                </div>
                {session.ended_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500">Ended:</span>
                    <span className="text-surface-400">{formatRelativeTime(session.ended_at)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-surface-800/60 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => loadSession(session)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-1.5"
                  disabled={activeSession?.id === session.id}
                >
                  <Play size={14} /> {activeSession?.id === session.id ? 'Loaded' : 'Load Session'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this session? All data will be lost.')) {
                      deleteSession.mutate(session.id);
                    }
                  }}
                  className="btn-icon text-accent-rose hover:bg-accent-rose/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

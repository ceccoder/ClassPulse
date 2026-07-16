import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Search, Download, Hand, CheckCircle2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { attendanceApi, reportsApi } from '@/services/api';
import { useSessionStore } from '@/store';
import { formatTime, downloadUrl } from '@/utils';
import type { Attendance, HandRaise } from '@/types';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const activeSession = useSessionStore(s => s.activeSession);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'attendance' | 'hands'>('attendance');

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', activeSession?.id],
    queryFn: () => attendanceApi.getBySession(activeSession!.id),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const { data: handRaises = [] } = useQuery({
    queryKey: ['handraises', activeSession?.id],
    queryFn: () => attendanceApi.getHandRaises(activeSession!.id),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const acknowledge = useMutation({
    mutationFn: (id: number) => attendanceApi.acknowledgeHandRaise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handraises'] });
      toast.success('Hand raise acknowledged');
    }
  });

  const deleteHand = useMutation({
    mutationFn: (id: number) => attendanceApi.deleteHandRaise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handraises'] });
    }
  });

  const filteredAttendance = useMemo(() => {
    if (!search) return attendance;
    const lower = search.toLowerCase();
    return attendance.filter((a: Attendance) =>
      a.student?.display_name.toLowerCase().includes(lower)
    );
  }, [attendance, search]);

  const pendingHands = handRaises.filter((h: HandRaise) => !h.acknowledged);

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-surface-500">
        <ClipboardList size={48} className="mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-surface-300 mb-2">No Active Session</h2>
        <p className="text-sm">Create a session from the Dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance & Hands</h1>
          <p className="text-surface-400 text-sm mt-1">
            {attendance.length} students marked present
          </p>
        </div>
        <button
          onClick={() => downloadUrl(reportsApi.exportAttendanceCsv(activeSession.id), `attendance_${activeSession.id}.csv`)}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex gap-4 border-b border-surface-800/60">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'attendance' ? 'text-white border-brand-500' : 'text-surface-400 border-transparent hover:text-surface-200'
          }`}
        >
          Present ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('hands')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'hands' ? 'text-white border-brand-500' : 'text-surface-400 border-transparent hover:text-surface-200'
          }`}
        >
          Hand Raises
          {pendingHands.length > 0 && (
            <span className="bg-accent-amber text-surface-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingHands.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <div className="glass-card">
          <div className="p-4 border-b border-surface-800/60">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Time Marked</th>
                  <th className="table-header w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-surface-500 text-sm">
                      No students marked present yet
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record: Attendance) => (
                    <tr key={record.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold font-mono">
                            {record.student?.display_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{record.student?.display_name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-surface-400 font-mono text-xs">
                        {formatTime(record.marked_at)}
                      </td>
                      <td className="table-cell">
                        <CheckCircle2 size={18} className="text-accent-emerald" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {handRaises.length === 0 ? (
            <div className="glass-card p-12 text-center text-surface-500">
              <Hand size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-surface-300 font-medium mb-1">No hands raised</p>
              <p className="text-sm">Students can type #hand in chat to raise their hand</p>
            </div>
          ) : (
            handRaises.map((hr: HandRaise) => (
              <div key={hr.id} className={`glass-card p-4 flex items-center justify-between transition-all ${
                hr.acknowledged ? 'opacity-60' : 'border-accent-amber/30 border-glow-amber'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    hr.acknowledged ? 'bg-surface-800 text-surface-500' : 'bg-accent-amber/20 text-accent-amber'
                  }`}>
                    <Hand size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{hr.student?.display_name}</span>
                      <span className="text-xs text-surface-500 font-mono">{formatTime(hr.raised_at)}</span>
                    </div>
                    {hr.message && hr.message !== '#hand' && (
                      <p className="text-sm text-surface-300 mt-1">{hr.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hr.acknowledged && (
                    <button
                      onClick={() => acknowledge.mutate(hr.id)}
                      className="btn-success text-xs px-3 py-1.5"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => deleteHand.mutate(hr.id)}
                    className="btn-icon text-accent-rose"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

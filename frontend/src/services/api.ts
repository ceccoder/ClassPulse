import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsApi = {
  create: (data: { title: string; platform?: string; stream_id?: string }) =>
    api.post('/sessions/', data).then(r => r.data),

  list: (status?: string) =>
    api.get('/sessions/', { params: status ? { status } : {} }).then(r => r.data),

  getActive: () =>
    api.get('/sessions/active').then(r => r.data),

  get: (id: number) =>
    api.get(`/sessions/${id}`).then(r => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/sessions/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/sessions/${id}`).then(r => r.data),

  startPolling: (id: number) =>
    api.post(`/sessions/${id}/start-polling`).then(r => r.data),

  stopPolling: (id: number) =>
    api.post(`/sessions/${id}/stop-polling`).then(r => r.data),
};

// ─── Polls ─────────────────────────────────────────────────────────────────────

export const pollsApi = {
  create: (data: Record<string, unknown>) =>
    api.post('/polls/', data).then(r => r.data),

  getBySession: (sessionId: number) =>
    api.get(`/polls/session/${sessionId}`).then(r => r.data),

  get: (id: number) =>
    api.get(`/polls/${id}`).then(r => r.data),

  start: (id: number) =>
    api.post(`/polls/${id}/start`).then(r => r.data),

  pause: (id: number) =>
    api.post(`/polls/${id}/pause`).then(r => r.data),

  resume: (id: number) =>
    api.post(`/polls/${id}/resume`).then(r => r.data),

  end: (id: number) =>
    api.post(`/polls/${id}/end`).then(r => r.data),

  reset: (id: number) =>
    api.post(`/polls/${id}/reset`).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/polls/${id}`).then(r => r.data),

  getVoters: (id: number) =>
    api.get(`/polls/${id}/voters`).then(r => r.data),
};

// ─── Quiz ──────────────────────────────────────────────────────────────────────

export const quizApi = {
  create: (data: Record<string, unknown>) =>
    api.post('/quiz/', data).then(r => r.data),

  getBySession: (sessionId: number) =>
    api.get(`/quiz/session/${sessionId}`).then(r => r.data),

  get: (id: number) =>
    api.get(`/quiz/${id}`).then(r => r.data),

  start: (id: number) =>
    api.post(`/quiz/${id}/start`).then(r => r.data),

  activateQuestion: (quizId: number, questionId: number) =>
    api.post(`/quiz/${quizId}/question/${questionId}/activate`).then(r => r.data),

  end: (id: number) =>
    api.post(`/quiz/${id}/end`).then(r => r.data),

  leaderboard: (id: number) =>
    api.get(`/quiz/${id}/leaderboard`).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/quiz/${id}`).then(r => r.data),
};

// ─── Attendance ─────────────────────────────────────────────────────────────────

export const attendanceApi = {
  getBySession: (sessionId: number) =>
    api.get(`/attendance/session/${sessionId}`).then(r => r.data),

  getCount: (sessionId: number) =>
    api.get(`/attendance/session/${sessionId}/count`).then(r => r.data),

  getHandRaises: (sessionId: number, acknowledged?: boolean) =>
    api.get(`/attendance/session/${sessionId}/handraises`, {
      params: acknowledged !== undefined ? { acknowledged } : {}
    }).then(r => r.data),

  acknowledgeHandRaise: (id: number) =>
    api.post(`/attendance/handraises/${id}/acknowledge`).then(r => r.data),

  deleteHandRaise: (id: number) =>
    api.delete(`/attendance/handraises/${id}`).then(r => r.data),
};

// ─── Leaderboard ───────────────────────────────────────────────────────────────

export const leaderboardApi = {
  getBySession: (sessionId: number, limit?: number, sortBy?: string) =>
    api.get(`/leaderboard/session/${sessionId}`, {
      params: { limit: limit || 20, sort_by: sortBy || 'score' }
    }).then(r => r.data),

  getStats: (sessionId: number) =>
    api.get(`/leaderboard/session/${sessionId}/stats`).then(r => r.data),
};

// ─── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getOverview: (sessionId: number) =>
    api.get(`/analytics/session/${sessionId}/overview`).then(r => r.data),
};

// ─── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  getSummary: (sessionId: number) =>
    api.get(`/reports/session/${sessionId}/summary`).then(r => r.data),

  exportAttendanceCsv: (sessionId: number) =>
    `${import.meta.env.VITE_API_URL || ''}/api/reports/session/${sessionId}/attendance/csv`,

  exportLeaderboardCsv: (sessionId: number) =>
    `${import.meta.env.VITE_API_URL || ''}/api/reports/session/${sessionId}/leaderboard/csv`,

  exportPollsCsv: (sessionId: number) =>
    `${import.meta.env.VITE_API_URL || ''}/api/reports/session/${sessionId}/polls/csv`,

  exportQuizCsv: (sessionId: number) =>
    `${import.meta.env.VITE_API_URL || ''}/api/reports/session/${sessionId}/quiz/csv`,
};

// ─── Activity ──────────────────────────────────────────────────────────────────

export const activityApi = {
  getBySession: (sessionId: number, limit?: number) =>
    api.get(`/activity/session/${sessionId}`, { params: { limit: limit || 50 } }).then(r => r.data),

  clear: (sessionId: number) =>
    api.delete(`/activity/session/${sessionId}`).then(r => r.data),
};

// ─── Settings ──────────────────────────────────────────────────────────────────

export const settingsApi = {
  getAll: () =>
    api.get('/settings/').then(r => r.data),

  get: (key: string) =>
    api.get(`/settings/${key}`).then(r => r.data),

  update: (key: string, value: string) =>
    api.put(`/settings/${key}`, { key, value }).then(r => r.data),

  bulkUpdate: (updates: { key: string; value: string }[]) =>
    api.post('/settings/bulk', updates).then(r => r.data),
};

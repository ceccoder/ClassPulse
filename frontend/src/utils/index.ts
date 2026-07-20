/**
 * Utility functions for ClassPulse.
 */
import { formatDistanceToNow, format } from 'date-fns';

function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    if (date.includes('T') && !date.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(date)) {
      return new Date(`${date}Z`);
    }
  }
  return new Date(date);
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(parseDate(date), { addSuffix: true });
}

export function formatDateTime(date: string | Date): string {
  return format(parseDate(date), 'MMM d, yyyy HH:mm');
}

export function formatTime(date: string | Date): string {
  return format(parseDate(date), 'HH:mm:ss');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const POLL_COLORS = [
  '#6370f0', // brand
  '#22d3ee', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // sky
  '#84cc16', // lime
];

export const CHART_COLORS = {
  brand: { bg: 'rgba(99, 112, 240, 0.7)', border: '#6370f0' },
  cyan: { bg: 'rgba(34, 211, 238, 0.7)', border: '#22d3ee' },
  emerald: { bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' },
  amber: { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },
  rose: { bg: 'rgba(244, 63, 94, 0.7)', border: '#f43f5e' },
  violet: { bg: 'rgba(139, 92, 246, 0.7)', border: '#8b5cf6' },
};

export const EVENT_ICONS: Record<string, string> = {
  new_student: '👋',
  attendance: '✅',
  hand_raise: '✋',
  poll_vote: '🗳️',
  quiz_correct: '🎯',
  quiz_answer: '💡',
  poll_started: '📊',
  poll_ended: '📊',
  quiz_started: '❓',
  quiz_ended: '🏁',
};

export const EVENT_COLORS: Record<string, string> = {
  new_student: 'text-accent-cyan',
  attendance: 'text-accent-emerald',
  hand_raise: 'text-accent-amber',
  poll_vote: 'text-brand-400',
  quiz_correct: 'text-accent-emerald',
  quiz_answer: 'text-brand-400',
  poll_started: 'text-accent-violet',
  poll_ended: 'text-surface-400',
  quiz_started: 'text-accent-violet',
  quiz_ended: 'text-surface-400',
};

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function extractYouTubeVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return trimmed;
}

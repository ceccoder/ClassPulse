// ─── Session Types ─────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'paused' | 'ended';

export interface ClassSession {
  id: number;
  title: string;
  platform: string;
  stream_id: string | null;
  live_chat_id: string | null;
  status: SessionStatus;
  created_at: string;
  ended_at: string | null;
}

// ─── Student Types ─────────────────────────────────────────────────────────────

export interface Student {
  id: number;
  session_id: number;
  channel_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  quiz_score: number;
  poll_participations: number;
  first_seen: string;
  last_seen: string;
}

// ─── Poll Types ────────────────────────────────────────────────────────────────

export type PollStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface PollOption {
  id: number;
  poll_id: number;
  text: string;
  keyword: string;
  vote_count: number;
}

export interface Poll {
  id: number;
  session_id: number;
  question: string;
  status: PollStatus;
  allow_vote_change: boolean;
  total_votes: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  options: PollOption[];
}

export interface CreatePollData {
  session_id: number;
  question: string;
  options: { text: string; keyword: string }[];
  allow_vote_change: boolean;
}

// ─── Quiz Types ────────────────────────────────────────────────────────────────

export type QuizStatus = 'draft' | 'active' | 'ended';

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  correct_answer: string;
  options: string[];
  order: number;
  is_active: boolean;
  started_at: string | null;
}

export interface Quiz {
  id: number;
  session_id: number;
  title: string;
  status: QuizStatus;
  time_limit_seconds: number | null;
  points_per_correct: number;
  speed_bonus: boolean;
  created_at: string;
  questions: QuizQuestion[];
}

export interface CreateQuizData {
  session_id: number;
  title: string;
  time_limit_seconds: number;
  points_per_correct: number;
  speed_bonus: boolean;
  questions: {
    question: string;
    correct_answer: string;
    options: string[];
    order: number;
  }[];
}

// ─── Attendance Types ──────────────────────────────────────────────────────────

export interface Attendance {
  id: number;
  session_id: number;
  student_id: number;
  marked_at: string;
  message: string | null;
  student: Student | null;
}

export interface HandRaise {
  id: number;
  session_id: number;
  student_id: number;
  message: string | null;
  raised_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  student: Student | null;
}

// ─── Activity Types ────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number;
  session_id: number;
  event_type: string;
  description: string;
  student_name: string | null;
  metadata_json: string | null;
  created_at: string;
}

// ─── Analytics Types ───────────────────────────────────────────────────────────

export interface SessionStats {
  total_students: number;
  present_count: number;
  poll_count: number;
  quiz_count: number;
  hand_raises: number;
  top_students: {
    id: number;
    name: string;
    score: number;
    quiz_score: number;
    poll_participations: number;
    avatar_url: string | null;
  }[];
}

// ─── WebSocket Event Types ─────────────────────────────────────────────────────

export type WSEventType =
  | 'poll_vote'
  | 'poll_started'
  | 'poll_paused'
  | 'poll_resumed'
  | 'poll_ended'
  | 'poll_reset'
  | 'quiz_started'
  | 'quiz_ended'
  | 'quiz_question_active'
  | 'quiz_answer'
  | 'attendance_marked'
  | 'hand_raised'
  | 'new_student'
  | 'activity'
  | 'pong';

export interface WSEvent {
  event: WSEventType;
  data: Record<string, unknown>;
  session_id: number | null;
}

// ─── Settings Types ────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

// ─── Report Types ──────────────────────────────────────────────────────────────

export interface SessionSummary {
  session: {
    id: number;
    title: string;
    platform: string;
    status: string;
    created_at: string;
    ended_at: string | null;
  } | null;
  student_count: number;
  present_count: number;
  poll_count: number;
  top_students: { name: string; score: number; quiz_score: number }[];
  polls: {
    question: string;
    total_votes: number;
    options: { keyword: string; text: string; votes: number }[];
  }[];
}
